const express = require('express');
const router = express.Router();
const contact = require('../controllers/contact');
const verifyToken = require('../config/jwt');

router.post('/contact', contact.contactCreater);

// 

router.get('/admin/contact/all',verifyToken, contact.allContactData);

module.exports = router;
