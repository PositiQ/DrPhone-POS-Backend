const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// CREATE new shop
router.post('/', shopController.createShop);

// GET all shops
router.get('/', shopController.getAllShops);

// Search shops
router.get('/search', shopController.searchShops);

// GET shop sales summary by shop ID
router.get('/:id/sales-summary', shopController.getShopSalesSummary);

// GET shop by ID
router.get('/:id', shopController.getShopById);

// UPDATE shop by ID
router.put('/:id', shopController.updateShop);

// DELETE shop by ID
router.delete('/:id', shopController.deleteShop);

module.exports = router;
