const express = require('express');
const router = express.Router();
const dealer = require('../controllers/dealer');
const verifyToken = require('../config/jwt');

router.post('/dealer', dealer.dealerCreater);

// 

router.get('/admin/dealer/all', verifyToken, dealer.allDealerData);

module.exports = router;
