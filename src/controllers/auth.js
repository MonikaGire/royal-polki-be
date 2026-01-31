// controllers/userController.js
const User = require('../models/User');
const Products = require('../models/Product');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/** Normalize GST:
 * - trims
 * - uppercases
 * - returns undefined when empty/nullish so the field is omitted entirely
 */
function normalizeGst(value) {
  if (value == null) return undefined;
  const v = String(value).trim().toUpperCase();
  return v === '' ? undefined : v;
}

/** Send Gmail via nodemailer (shared config) */
function makeGmailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/** Common duplicate-key error mapper */
function handleDuplicateKey(res, error) {
  if (error?.code === 11000) {
    const fields = Object.keys(error.keyPattern || {});
    if (fields.includes('email')) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    if (fields.includes('gst')) {
      return res.status(400).json({ success: false, message: 'GST already in use' });
    }
    // generic E11000
    return res.status(400).json({ success: false, message: 'Duplicate value for a unique field' });
  }
  return null;
}

const registerUser = async (req, res) => {
  try {
    const request = { ...req.body };

    // Normalize + omit GST if blank/nullish
    const gst = normalizeGst(request.gst);
    if (gst === undefined) delete request.gst;
    else request.gst = gst;

    // Basic email uniqueness check (race-safe path is relying on DB unique index)
    const UserCount = await User.countDocuments();
    const existingUser = await User.findOne({ email: request.email });
    if (existingUser) {
      return res.status(400).json({
        UserCount,
        success: false,
        message: 'User With This Email Already Exists',
      });
    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true,
    });

    // Create user
    const user = await User.create({
      ...request,
      otp,
      role: Boolean(UserCount) ? request.role || 'user' : 'super admin',
    });

    // JWT
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare OTP email
    const htmlFilePath = path.join(process.cwd(), 'src/email-templates', 'otp.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    htmlContent = htmlContent.replace(/<h1>[\s\d]*<\/h1>/g, `<h1>${otp}</h1>`);
    htmlContent = htmlContent.replace(/usingyourmail@gmail\.com/g, user.email);

    const transporter = makeGmailTransport();
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Verify your email',
      html: htmlContent,
    });

    return res.status(201).json({
      success: true,
      message: 'Created User Successfully',
      otp,
      token,
      user,
    });
  } catch (error) {
    // Map duplicate-key errors first
    const handled = handleDuplicateKey(res, error);
    if (handled) return;

    return res.status(500).json({
      success: false,
      message: error.message,
      status: 500,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body; // no await here
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }
    if (!user.password) {
      return res.status(404).json({ success: false, message: 'User Password Not Found' });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect Password' });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const products = await Products.aggregate([
      { $match: { _id: { $in: user.wishlist } } },
      {
        $lookup: {
          from: 'reviews',
          localField: 'reviews',
          foreignField: '_id',
          as: 'reviews',
        },
      },
      {
        $addFields: {
          averageRating: { $avg: '$reviews.rating' },
          image: { $arrayElemAt: ['$images', 0] },
        },
      },
      {
        $project: {
          image: { url: '$image.url', blurDataURL: '$image.blurDataURL' },
          name: 1,
          slug: 1,
          colors: 1,
          discount: 1,
          available: 1,
          likes: 1,
          priceSale: 1,
          price: 1,
          averageRating: 1,
          createdAt: 1,
        },
      },
    ]);

    return res.status(201).json({
      success: true,
      message: 'Login Successfully',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        gst: user.gst,
        cover: user.cover,
        gender: user.gender,
        phone: user.phone,
        address: user.address,
        city: user.city,
        country: user.country,
        zip: user.zip,
        state: user.state,
        about: user.about,
        role: user.role,
        wishlist: products,
      },
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

const forgetPassword = async (req, res) => {
  try {
    const request = req.body; // no await
    const user = await User.findOne({ email: request.email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User Not Found ' });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const resetPasswordLink = `${request.origin}/auth/reset-password/${token}`;

    const htmlFilePath = path.join(process.cwd(), 'src/email-templates', 'forget.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    htmlContent = htmlContent.replace(/href="javascript:void\(0\);"/g, `href="${resetPasswordLink}"`);

    const transporter = makeGmailTransport();
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Verify your email',
      html: htmlContent,
    });

    return res.status(200).json({
      success: true,
      message: 'Forgot Password Email Sent Successfully.',
      token,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body; // no await

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Or Expired Token. Please Request A New One.',
      });
    }

    const user = await User.findById(decoded._id).select('password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User Not Found ' });
    }
    if (!newPassword || !user.password) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Data. Both NewPassword And User Password Are Required.',
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New Password Must Be Different From The Old Password.',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, { password: hashedPassword });

    return res.status(201).json({
      success: true,
      message: 'Password Updated Successfully.',
      user,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body; // no await

    const user = await User.findOne({ email }).maxTimeMS(30000).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'OTP Has Already Been Verified' });
    }

    if (otp === user.otp) {
      user.isVerified = true;
      await user.save();
      return res.status(201).json({ success: true, message: 'OTP Verified Successfully' });
    }

    return res.status(404).json({ success: false, message: 'Invalid OTP' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body; // no await

    const user = await User.findOne({ email }).maxTimeMS(30000).exec();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User Not Found' });
    }
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'OTP Has Already Been Verified' });
    }

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true,
    });

    await User.findByIdAndUpdate(user._id, { otp: otp.toString() });

    const htmlFilePath = path.join(process.cwd(), 'src/email-templates', 'otp.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    htmlContent = htmlContent.replace(/<h1>[\s\d]*<\/h1>/g, `<h1>${otp}</h1>`);
    htmlContent = htmlContent.replace(/usingyourmail@gmail\.com/g, user.email);

    const transporter = makeGmailTransport();
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: user.email,
      subject: 'Verify your email',
      html: htmlContent,
    });

    return res.status(200).json({ success: true, message: 'OTP Resent Successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgetPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
};
