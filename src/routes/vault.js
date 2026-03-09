const express = require('express');
const router = express.Router();
const vaultController = require('../controllers/vaultController');

// CREATE new vault (bank or drawer)
router.post('/', vaultController.createVault);

// GET total vault balance with credit/debit summary
router.get('/balance', vaultController.getTotalVaultBalance);

// GET all vault accounts (for dropdowns)
router.get('/accounts', vaultController.getVaultAccounts);

// GET all transactions (paginated)
router.get('/transactions', vaultController.getAllTransactions);

// GET transaction history for a specific account (paginated)
router.get('/transactions/account/:account_id', vaultController.getTransactionHistory);

// CREATE new transaction
router.post('/transactions', vaultController.createNewTransaction);

// UPDATE transaction by ID
router.put('/transactions/:transaction_id', vaultController.updateTransaction);

// DELETE transaction by ID
router.delete('/transactions/:transaction_id', vaultController.deleteTransaction);

// GET bank account by ID
router.get('/bank/:bank_acc_id', vaultController.getBankAccount);

// UPDATE bank account by ID
router.put('/bank/:bank_acc_id', vaultController.editBankAccount);

// DELETE bank account by ID
router.delete('/bank/:bank_acc_id', vaultController.deleteBankAccount);

// GET drawer account by ID
router.get('/drawer/:drawer_acc_id', vaultController.getDrawerAccount);

// UPDATE drawer account by ID
router.put('/drawer/:drawer_acc_id', vaultController.editDrawerAccount);

// DELETE drawer account by ID
router.delete('/drawer/:drawer_acc_id', vaultController.deleteDrawerAccount);

module.exports = router;
