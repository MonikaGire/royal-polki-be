const express = require('express');
const router = express.Router();
const wishlistRoutes = require('../controllers/wishlist');
const verifyToken = require('../config/jwt');

//user routes
router.get('/wishlist', verifyToken, wishlistRoutes.getWishlist);
router.post('/wishlist', verifyToken, wishlistRoutes.createWishlist);

module.exports = router;
