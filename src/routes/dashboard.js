const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboard');

// Import verifyToken function
const verifyToken = require('../config/jwt');

router.get(
  '/admin/dashboard-analytics',
  verifyToken,
  dashboard.getDashboardAnalytics
);

router.get('/admin/notifications', verifyToken, dashboard.getNofications);

module.exports = router;
