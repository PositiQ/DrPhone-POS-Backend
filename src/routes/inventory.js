const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// ISSUE stock to a shop
router.post('/issue', stockController.issueStock);

// GET all stock issues
router.get('/issues', stockController.getAllStockIssues);

module.exports = router;
