const Notifications = require('../models/Notification');
const Products = require('../models/Product');
const Orders = require('../models/Order');
const Coupons = require('../models/CouponCode');
const User = require('../models/User');

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

function isExpired(expirationDate) {
  const currentDateTime = new Date();
  return currentDateTime >= new Date(expirationDate);
}

function generateOrderNumber() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let orderNumber = '';

  // Generate a random alphabet character
  orderNumber += alphabet.charAt(Math.floor(Math.random() * alphabet.length));

  // Generate 4 random digits
  for (let i = 0; i < 6; i++) {
    orderNumber += Math.floor(Math.random() * 10);
  }

  return orderNumber;
}

function readHTMLTemplate() {
  const htmlFilePath = path.join(
    process.cwd(),
    'src/email-templates',
    'order.html'
  );
  return fs.readFileSync(htmlFilePath, 'utf8');
}

const createOrder = async (req, res) => {
  try {
    const {
      items,
      user,
      paymentMethod,
      paymentId,
      couponCode,
      totalItems,
      shipping = 0,
      gst = 0,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: "Please Provide Item(s)" });
    }

    const products = await Products.find({
      _id: { $in: items.map((item) => item.pid) },
    });

    // map items & update stock
    const updatedItems = items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.pid);
      const price = product ? product.priceSale : 0;
      const total = price * item.quantity;

      Products.findOneAndUpdate(
        { _id: item.pid, available: { $gte: 0 } },
        { $inc: { available: -item.quantity, sold: item.quantity } },
        { new: true, runValidators: true }
      ).exec();

      return {
        ...item,
        total,
        imageUrl: product?.images?.length > 0 ? product.images[0].url : "",
      };
    });

    // subtotal
    const subTotal = updatedItems.reduce((acc, item) => acc + item.total, 0);

    // discount
    let discount = 0;
    if (couponCode) {
      const couponData = await Coupons.findOne({ code: couponCode });
      if (!couponData) {
        return res.status(400).json({ success: false, message: "Invalid Coupon" });
      }
      const expired = isExpired(couponData.expire);
      if (expired) {
        return res.status(400).json({ success: false, message: "CouponCode Is Expired" });
      }

      await Coupons.findOneAndUpdate(
        { code: couponCode },
        { $addToSet: { usedBy: user.email } }
      );

      if (couponData.type === "percent") {
        discount = (couponData.discount / 100) * subTotal;
      } else {
        discount = couponData.discount;
      }
    }

    // ✅ apply GST amount (already calculated on frontend)
    const gstAmount = gst ? Number(gst) : 0;

    // final total
    const finalTotal = subTotal + gstAmount - discount + Number(shipping);

    const existingUser = await User.findOne({ email: user.email });
    const orderNo = generateOrderNumber();

    const orderCreated = await Orders.create({
      paymentMethod,
      paymentId,
      discount,
      total: finalTotal,
      subTotal,
      shipping,
      gst: gstAmount,
      items: updatedItems.map(({ image, ...others }) => others),
      user: existingUser ? { ...user, _id: existingUser._id } : user,
      totalItems,
      orderNo,
      status: "pending",
    });

    await Notifications.create({
      opened: false,
      title: `${user.firstName} ${user.lastName} placed an order from ${user.city}.`,
      paymentMethod,
      orderId: orderCreated._id,
      city: user.city,
      cover: user?.cover?.url || "",
    });

    // ✉ email template
    let htmlContent = readHTMLTemplate();
    htmlContent = htmlContent.replace(/{{recipientName}}/g, `${user.firstName} ${user.lastName}`);

    let itemsHtml = "";
    updatedItems.forEach((item) => {
      itemsHtml += `
        <tr style='border-bottom: 1px solid #e4e4e4;'>
          <td><img src="${item.imageUrl}" alt="${item.name}" style="width:62px;height:62px;object-fit:cover;border-radius:8px;"></td>
          <td style="padding:10px;">${item.name}</td>         
          <td style="padding:10px;">${item.sku}</td>
          <td style="padding:10px;">${item.quantity}</td>
          <td style="padding:10px;">${item.total}</td>
        </tr>`;
    });

    htmlContent = htmlContent.replace(/{{items}}/g, itemsHtml);
    htmlContent = htmlContent.replace(/{{grandTotal}}/g, finalTotal.toFixed(2));
    htmlContent = htmlContent.replace(/{{Shipping}}/g, shipping);
    htmlContent = htmlContent.replace(/{{subTotal}}/g, subTotal);
    htmlContent = htmlContent.replace(/{{GST}}/g, gstAmount.toFixed(2));
    htmlContent = htmlContent.replace(/{{Discount}}/g, discount.toFixed(2));

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: "Your Order Confirmation",
      html: htmlContent,
    });

    return res.status(201).json({
      success: true,
      message: "Order Placed",
      orderId: orderCreated._id,
      orderNo,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
const getOrderById = async (req, res) => {
  try {
    const id = req.params.id;
    const orderGet = await Orders.findById(id); // Remove curly braces around _id: id

    if (!orderGet) {
      return res
        .status(404)
        .json({ success: false, message: 'Order Not Found' });
    }

    return res.status(200).json({
      success: true,
      data: orderGet,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const getOrdersByAdmin = async (req, res) => {
  try {
    const {
      page: pageQuery,
      limit: limitQuery,
      search: searchQuery,
    } = req.query;

    const limit = parseInt(limitQuery) || 10;
    const page = parseInt(pageQuery) || 1;

    const skip = limit * (page - 1);
    let matchQuery = {};

    const totalOrders = await Orders.countDocuments({
      $or: [
        { 'user.firstName': { $regex: searchQuery || '', $options: 'i' } },
        { 'user.lastName': { $regex: searchQuery || '', $options: 'i' } },
      ],
      ...matchQuery,
    });

    const orders = await Orders.aggregate([
      { $match: { ...matchQuery } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      total: totalOrders,
      count: Math.ceil(totalOrders / parseInt(limit)),
      currentPage: page,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getOneOrderByAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    await Notifications.findOneAndUpdate(
      { orderId: id },
      {
        opened: true,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    const orderGet = await Orders.findById({ _id: id });
    if (!orderGet) {
      return res.status(404).json({
        success: false,
        message: 'Order Not Found',
      });
    }

    return res.status(200).json({
      success: true,
      data: orderGet,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const updateOrderByAdmin = async (req, res) => {
  try {
    const id = req.params.id;
    const data = await req.body;
    const order = await Orders.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order Not Found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Order Updated',
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const deleteOrderByAdmin = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Find the order to be deleted
    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order Not Found',
      });
    }

    // Delete the order from the Orders collection
    await Orders.findByIdAndDelete(orderId);

    // Remove the order ID from the user's order array
    await User.findOneAndUpdate(
      { _id: order.user },
      { $pull: { orders: orderId } }
    );

    // Delete notifications related to the order
    await Notifications.deleteMany({ orderId });

    return res.status(200).json({
      success: true,
      message: 'Order Deleted',
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const updateOrderStatusByUser = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Find the order
    const order = await Orders.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });
    // Check time constraint (createdAt should be within 24 hours)
    const createdAt = new Date(order.createdAt);
    const now = new Date();
    const diffHours = (now - createdAt) / (1000 * 60 * 60);
    if (diffHours > 24) {
      return res.status(400).json({ message: "Order status can only be updated within 24 hours of order placement." });
    }

    // Optionally: restrict to allowed statuses
    // const allowed = ["Cancelled", "OtherStatus"];
    // if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    // Only allow "Cancelled" as the status
    if (status !== "Cancelled") {
      return res.status(400).json({ message: 'Only "Cancelled" status is allowed.' });
    }
    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByAdmin,
  getOneOrderByAdmin,
  updateOrderByAdmin,
  deleteOrderByAdmin,
  updateOrderStatusByUser
};