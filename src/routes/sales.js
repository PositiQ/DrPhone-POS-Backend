const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

// CREATE new sale
router.post('/', salesController.createSale);

// GET all sales with filters
router.get('/', salesController.getAllSales);

// GET sales summary/statistics
router.get('/summary', salesController.getSalesSummary);

// GET sales by customer ID
router.get('/customer/:customer_id', salesController.getSalesByCustomer);

// GET sale by ID
router.get('/:id', salesController.getSaleById);

// UPDATE sale status
router.patch('/:id/status', salesController.updateSaleStatus);

// DELETE sale by ID
router.delete('/:id', salesController.deleteSale);

module.exports = router;
