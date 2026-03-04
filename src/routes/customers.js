const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// CREATE new customer
router.post('/', customerController.createCustomer);

// GET all customers
router.get('/', customerController.getAllCustomers);

// Search customers
router.get('/search', customerController.searchCustomers);

// GET customers with outstanding dues
router.get('/dues', customerController.getCustomersWithDues);

// GET customer by ID
router.get('/:id', customerController.getCustomerById);

// UPDATE customer by ID
router.put('/:id', customerController.updateCustomer);

// DELETE customer by ID
router.delete('/:id', customerController.deleteCustomer);

// GET customer sales history
router.get('/:id/sales', customerController.getCustomerSales);

// CREATE customer sale record
router.post('/sales', customerController.createCustomerSale);

// UPDATE customer sale by ID
router.put('/sales/:id', customerController.updateCustomerSale);

module.exports = router;
