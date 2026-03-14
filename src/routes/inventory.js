const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// ISSUE stock to a shop
router.post('/issue', stockController.issueStock);

// GET all stock issues
router.get('/issues', stockController.getAllStockIssues);

// GET stock issues for a single shop
router.get('/issues/shop/:shopId', stockController.getShopStockIssues);

// SETTLE shop pending payments (full or half)
router.post('/issues/shop/:shopId/settle', stockController.settleShopPayments);

// COMPLETE a pending stock issue sale
router.put('/issues/:id/complete', stockController.completeStockIssueSale);

module.exports = router;
