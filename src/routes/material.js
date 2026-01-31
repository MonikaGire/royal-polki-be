const express = require('express');
const router = express.Router();
const material = require('../controllers/material');

// Import verifyToken function
const verifyToken = require('../config/jwt');

// admin routes

router.post('/admin/materials', verifyToken, material.createMaterial);

router.get('/admin/materials', verifyToken, material.getMaterials);

router.get('/admin/materials/:slug', verifyToken, material.getMaterialBySlug);

router.put('/admin/materials/:slug', verifyToken, material.updateMaterialBySlug);

router.delete('/admin/materials/:slug', verifyToken, material.deleteMaterialBySlug);

router.get('/admin/all-materials', material.getAllMaterials);

// User routes

router.get('/materials', material.getAllMaterials);

module.exports = router;
