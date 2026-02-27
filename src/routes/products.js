const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// CREATE new product
router.post('/', productController.createProduct);

module.exports = router;
