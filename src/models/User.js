const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'Please enter a firstName'] },
    lastName:  { type: String, required: [true, 'Please enter a lastName'] },
    email:     { type: String, required: [true, 'Please enter an email'], unique: true },

    gst: {
      type: String,
      // Normalize: uppercase + trim; if blank -> undefined (field omitted)
      set: (v) => {
        if (v == null) return undefined;               // null/undefined => omit
        const x = String(v).trim().toUpperCase();
        return x === '' ? undefined : x;               // empty => omit
      },
      match: [
        /^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})$/,
        'Please enter a valid GST number'
      ],
    },

    password: { type: String, select: false, required: [true, 'Please enter a password'], minlength: 8 },
    gender:   { type: String, enum: ['male', 'female', 'other'], required: [true, 'Please enter a gender'] },

    cover: {
      _id: String,
      url: String,
      blurDataURL: String,
    },

    cart:          [{ type: mongoose.Types.ObjectId, ref: 'Product' }],
    wishlist:      [{ type: mongoose.Types.ObjectId, ref: 'Product' }],
    orders:        [{ type: mongoose.Types.ObjectId, ref: 'Order' }],
    shop:          { type: mongoose.Types.ObjectId, ref: 'Shop' },
    recentProducts:[{ type: mongoose.Types.ObjectId, ref: 'Product' }],

    phone:   { type: String, required: [true, 'Please provide a Phone Number.'], maxlength: [20, 'Phone cannot be more than 20 characters.'] },

    status:  String,
    address: String,
    city:    String,
    zip:     String,
    country: String,
    state:   String,
    about:   String,

    isVerified:   { type: Boolean, default: false },
    otp:          { type: String, required: true },
    lastOtpSentAt:{ type: Date },

    role: { type: String, enum: ['super admin', 'admin', 'user'], required: true },
  },
  { timestamps: true }
);

// ✅ Unique only when gst is a real non-empty string
UserSchema.index(
  { gst: 1 },
  {
    unique: true,
    partialFilterExpression: {
      gst: { $exists: true, $type: 'string', $ne: '' }
    }
  }
);

// Hash the password before saving
UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
module.exports = User;
