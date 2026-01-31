'use strict';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use("/public", express.static(path.join(__dirname, 'public')));

// Fix for latest Mongoose deprecation warnings
mongoose.set("strictQuery", false);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error);
  });

// Routes
const homeRoutes = require('./routes/home');
const contactRoutes = require('./routes/contact');
const dealerRoutes = require('./routes/dealer');
const authRoutes = require('./routes/auth');
const brandRoutes = require('./routes/brand');
const materialRoutes = require('./routes/material');
const categoryRoutes = require('./routes/category');
const subcategoryRoutes = require('./routes/subcategory');
const newsletterRoutes = require('./routes/newsletter');
const productRoutes = require('./routes/product');
const dashboardRoutes = require('./routes/dashboard');
const searchRoutes = require('./routes/search');
const userRoutes = require('./routes/user');
const cartRoutes = require('./routes/cart');
const couponCodeRoutes = require('./routes/coupon-code');
const reviewRoutes = require('./routes/review');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/order');
const paymentRoutes = require('./routes/payment-intents');
const deleteFileRoutes = require('./routes/file-delete');

// Use Routes
app.use('/api', homeRoutes);
app.use('/api', contactRoutes);
app.use('/api', authRoutes);
app.use('/api', brandRoutes);
app.use('/api', materialRoutes);
app.use('/api', categoryRoutes);
app.use('/api', subcategoryRoutes);
app.use('/api', newsletterRoutes);
app.use('/api', productRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', searchRoutes);
app.use('/api', userRoutes);
app.use('/api', cartRoutes);
app.use('/api', couponCodeRoutes);
app.use('/api', reviewRoutes);
app.use('/api', wishlistRoutes);
app.use('/api', orderRoutes);
app.use('/api', paymentRoutes);
app.use('/api', deleteFileRoutes);
app.use('/api', dealerRoutes);

// Root API
app.get('/', (req, res) => {
  res.send('This is a GET API');
  // uploading build on 23-06-2025 at 15:06 by deep
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
