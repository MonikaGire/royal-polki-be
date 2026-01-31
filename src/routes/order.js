const express = require('express');
const router = express.Router();
const orderRoutes = require('../controllers/order');
// Import verifyToken function
const verifyToken = require('../config/jwt');
//user routes
router.post('/orders', orderRoutes.createOrder);
router.get('/orders/:id', orderRoutes.getOrderById);
router.put('/orders/:id/status', orderRoutes.updateOrderStatusByUser);
//admin routes
router.get('/admin/orders', verifyToken, orderRoutes.getOrdersByAdmin);
router.get('/admin/orders/:id', verifyToken, orderRoutes.getOneOrderByAdmin);
router.put('/admin/orders/:id', verifyToken, orderRoutes.updateOrderByAdmin);
router.delete('/admin/orders/:id', verifyToken, orderRoutes.deleteOrderByAdmin);

module.exports = router;
