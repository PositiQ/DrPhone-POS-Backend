const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// CREATE new product
router.post('/', productController.createProduct);

// GET all products
router.get('/', productController.getAllProducts);

// Search products
router.get('/search', productController.searchProducts);

// GET product by ID
router.get('/:id', productController.getProductById);

// UPDATE product by ID
router.put('/:id', productController.updateProduct);

// DELETE product by ID
router.delete('/:id', productController.deleteProduct);

module.exports = router;
