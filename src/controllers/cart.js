const Products = require('../models/Product');
const Users = require('../models/User');
const { getUser } = require('../config/getUser');


const getCart = async (request, response) => {
  try {
    const req = await request.body;
    const cartItems = [];

    for (const item of req.products) {
      const product = await Products.findById(item.pid).select([
        'cover',
        'name',
        'brand',
        'slug',
        'available',
        'price',
        'priceSale',
      ]);

      if (!product) {
        return response
          .status(404)
          .json({ success: false, message: 'Products Not Found' });
      }
      const { quantity, color, size, sku } = item;
      if (product.available < quantity) {
        return response
          .status(400)
          .json({ success: false, message: 'No Products in Stock' });
      }

      const subtotal = (product.priceSale || product.price) * quantity;
      const { ...others } = product.toObject();
      cartItems.push({
        ...others,
        pid: item.pid,
        quantity,
        size,
        image: item.image,
        color,
        subtotal: subtotal.toFixed(2),
        sku: sku,
      });
    }


    return response.status(200).json({
      success: true,
      data: cartItems,
    });
  } catch (error) {
    return response
      .status(400)
      .json({ success: false, message: error.message });
  }
};

const createCart = async (req, res) => {
  try {
    const user = await getUser(req, res);
    const uid = user._id.toString();
    const cart = user.cart;
    const { pid } = req.body;
    const isAlready = cart.filter((id) => id.toString() === pid);

    if (!Boolean(isAlready.length)) {
      await Users.findByIdAndUpdate(
        uid,
        { $addToSet: { cart: pid } }, // Add productId to the cart if not already present
        { new: true }
      );

      await Products.findByIdAndUpdate(pid, {
        $inc: { likes: 1 },
      });

      const newcart = [...cart, pid];

      return res.status(201).json({
        success: true,
        data: newcart,
        type: 'pushed',
        message: 'Added To Cart',
      });
    }
    await Products.findByIdAndUpdate(pid, {
      $inc: { likes: -1 },
    });

    await Users.findByIdAndUpdate(
      uid,
      { $pull: { cart: pid } },
      { new: true }
    );

    const removedCart = cart.filter((id) => id.toString() !== pid);

    return res.status(200).json({
      success: true,
      type: 'pulled',
      message: 'Removed From Cart',
      data: removedCart,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
const clearCart = async (req, res) => {
  try {
    const user = await getUser(req, res);
    await Users.findByIdAndUpdate(user._id, { cart: [] });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully after logout',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
module.exports = { getCart,createCart,clearCart};
