const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

// Category endpoints
router.get("/categories", expenseController.getExpenseCategories);
router.post("/categories", expenseController.createExpenseCategory);

// Expense endpoints
router.get("/summary", expenseController.getExpenseSummary);
router.get("/", expenseController.getExpenses);
router.post("/", expenseController.createExpense);

module.exports = router;