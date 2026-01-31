const Product = require('../models/Product');
// const Brand = require('../models/Brand');
const Material = require('../models/Material');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const csv = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const streamifier = require('streamifier');

exports.uploadBulkProducts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'CSV file is required' });
        }

        const success = [];
        const failed = [];
        const results = [];

        const stream = streamifier.createReadStream(req.file.buffer)
            .pipe(csv());

        stream.on('data', (row) => {
            results.push(row);
        });

        stream.on('end', async () => {
            for (let [index, row] of results.entries()) {
                try {
                    const materialDoc = row.material ? await Material.findOne({ name: row.material.trim() }) : null;
                    const categoryDoc = row.category ? await Category.findOne({ name: row.category.trim() }) : null;
                    let subCategoryDoc = null;
                    if (row.subCategory && categoryDoc) {
                        subCategoryDoc = await SubCategory.findOne({ name: row.subCategory.trim() });
                    }

                    const productData = {
                        name: row.name,
                        code: row.code,
                        status: row.status,
                        isFeatured: row.isFeatured === 'true',
                        material: materialDoc?._id,
                        description: row.description,
                        metaTitle: row.metaTitle,
                        metaDescription: row.metaDescription,
                        slug: row.slug,
                        category: categoryDoc?._id,
                        subCategory: subCategoryDoc?._id,
                        gender: row.gender,
                        tags: row.tags?.split(',').map((t) => t.trim()) || [],
                        sku: row.sku,
                        price: Number(row.price),
                        priceSale: Number(row.priceSale),
                        available: Number(row.available),
                        colors: row.colors?.split(',').map((c) => c.trim()) || [],
                        sizes: row.sizes?.split(',').map((s) => s.trim()) || [],
                        images: []
                    };

                    if (!productData.sku || !productData.price || !productData.priceSale || !productData.available || !productData.category || !productData.subCategory) {
                        throw new Error('Missing required fields');
                    }

                    await Product.create(productData);
                    success.push({ row: index + 1, sku: productData.sku });
                } catch (err) {
                    failed.push({
                        row: index + 1,
                        sku: row.sku || 'N/A',
                        reason: err.message
                    });
                }
            }

            return res.status(200).json({
                message: 'CSV processed',
                total: results.length,
                uploaded: success.length,
                failed: failed.length,
                success,
                failed
            });
        });

        stream.on('error', (err) => {
            console.error('CSV Stream Error:', err);
            return res.status(500).json({ message: 'Failed to parse CSV', error: err.message });
        });

    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({ message: 'Something went wrong', error: error.message });
    }
};