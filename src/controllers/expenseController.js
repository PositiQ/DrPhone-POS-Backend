const {
  expense,
  expenseCategory,
  account,
  drawerAcc,
  trasactions,
} = require("../models");
const generateId = require("../helpers/idGen");
const { Op } = require("sequelize");

const DEFAULT_CATEGORIES = [
  "rent",
  "utilities",
  "salary",
  "supplies",
  "maintenance",
  "other",
];

function normalizeCode(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAccountTypeFromPaymentMethod(paymentMethod) {
  const method = String(paymentMethod || "").toLowerCase();
  if (method === "cash") return "drawer";
  return "bank";
}

async function resolveExpenseAccount(accountId, paymentMethod, transaction) {
  if (accountId) {
    const selected = await account.findOne({
      where: { acc_id: accountId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (selected) return selected;
  }

  const preferredType = getAccountTypeFromPaymentMethod(paymentMethod);

  const preferred = await account.findOne({
    where: { type: preferredType },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (preferred) return preferred;

  const anyAccount = await account.findOne({
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (anyAccount) return anyAccount;

  const defaultAccount = await account.create({
    acc_id: await generateId("ACCOUNT", transaction),
    type: "drawer",
    available_balance: 0,
  }, { transaction });

  await drawerAcc.create({
    drawer_acc_id: await generateId("DRAWER", transaction),
    acc_id: defaultAccount.acc_id,
    name: "System Drawer",
    location: "Main Shop",
    added_date: new Date(),
  }, { transaction });

  return defaultAccount;
}

async function createExpenseTransaction({ accountRow, amount, description, transaction }) {
  const numericAmount = Number(amount || 0);
  if (!accountRow || numericAmount <= 0) return null;

  const beforeBalance = Number(accountRow.available_balance || 0);
  const afterBalance = beforeBalance - numericAmount;

  const transactionRow = await trasactions.create({
    transaction_id: await generateId("TRANS", transaction),
    amount: numericAmount,
    account_id: accountRow.acc_id,
    type: "debit",
    description,
    transaction_date: new Date(),
    account_balance_before: beforeBalance,
    account_balance_after: afterBalance,
  }, { transaction });

  await accountRow.update({ available_balance: afterBalance }, { transaction });
  return transactionRow;
}

async function ensureDefaultCategories(transaction) {
  for (const categoryName of DEFAULT_CATEGORIES) {
    const code = normalizeCode(categoryName);

    await expenseCategory.findOrCreate({
      where: { code },
      defaults: {
        category_id: await generateId("EXPCAT", transaction),
        name: categoryName,
        code,
        is_active: true,
      },
      transaction,
    });
  }
}

exports.getExpenseCategories = async (req, res) => {
  const t = await expense.sequelize.transaction();
  try {
    await ensureDefaultCategories(t);

    const categories = await expenseCategory.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
      transaction: t,
    });

    await t.commit();
    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createExpenseCategory = async (req, res) => {
  const t = await expense.sequelize.transaction();
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Category name is required",
      });
    }

    const code = normalizeCode(name);
    if (!code) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Invalid category name",
      });
    }

    const existing = await expenseCategory.findOne({
      where: {
        [Op.or]: [{ code }, { name }],
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existing) {
      if (!existing.is_active) {
        await existing.update({ is_active: true, name }, { transaction: t });
      }

      await t.commit();
      return res.status(200).json({
        success: true,
        message: "Expense category already exists",
        data: existing,
      });
    }

    const created = await expenseCategory.create({
      category_id: await generateId("EXPCAT", t),
      name,
      code,
      is_active: true,
    }, { transaction: t });

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Expense category created successfully",
      data: created,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createExpense = async (req, res) => {
  const t = await expense.sequelize.transaction();
  try {
    const {
      category,
      category_id,
      amount,
      expense_date,
      description,
      payment_method,
      status,
      account_id,
    } = req.body;

    const normalizedCategoryName = String(category || "").trim();
    const numericAmount = Number(amount || 0);
    const normalizedStatus = String(status || "approved").toLowerCase();
    const normalizedPaymentMethod = String(payment_method || "cash").toLowerCase();

    if (!normalizedCategoryName) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "Category is required" });
    }

    if (!numericAmount || numericAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "Amount must be greater than zero" });
    }

    if (!expense_date) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "Expense date is required" });
    }

    await ensureDefaultCategories(t);

    let categoryRecord = null;
    if (category_id) {
      categoryRecord = await expenseCategory.findOne({
        where: { category_id },
        transaction: t,
      });
    }

    if (!categoryRecord) {
      const code = normalizeCode(normalizedCategoryName);
      categoryRecord = await expenseCategory.findOne({
        where: {
          [Op.or]: [{ code }, { name: normalizedCategoryName }],
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    }

    if (!categoryRecord) {
      categoryRecord = await expenseCategory.create({
        category_id: await generateId("EXPCAT", t),
        name: normalizedCategoryName,
        code: normalizeCode(normalizedCategoryName),
        is_active: true,
      }, { transaction: t });
    }

    const accountRow = await resolveExpenseAccount(account_id, normalizedPaymentMethod, t);

    const createdExpense = await expense.create({
      expense_id: await generateId("EXP", t),
      category_id: categoryRecord.category_id,
      category: categoryRecord.code,
      amount: Number(numericAmount.toFixed(2)),
      expense_date,
      description: description || null,
      payment_method: normalizedPaymentMethod,
      status: normalizedStatus,
      account_id: accountRow.acc_id,
    }, { transaction: t });

    const txn = await createExpenseTransaction({
      accountRow,
      amount: numericAmount,
      description: `Expense ${createdExpense.expense_id} - ${categoryRecord.name}`,
      transaction: t,
    });

    if (txn) {
      await createdExpense.update({ transaction_id: txn.transaction_id }, { transaction: t });
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: createdExpense,
      transaction: txn
        ? {
            transaction_id: txn.transaction_id,
            account_id: txn.account_id,
            type: txn.type,
            amount: Number(txn.amount || 0),
          }
        : null,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (req.query.category) {
      whereClause.category = normalizeCode(req.query.category);
    }
    if (req.query.status) {
      whereClause.status = String(req.query.status).toLowerCase();
    }
    if (req.query.payment_method) {
      whereClause.payment_method = String(req.query.payment_method).toLowerCase();
    }
    if (req.query.query) {
      const text = String(req.query.query).trim();
      if (text) {
        whereClause[Op.or] = [
          { category: { [Op.like]: `%${text}%` } },
          { description: { [Op.like]: `%${text}%` } },
          { payment_method: { [Op.like]: `%${text}%` } },
        ];
      }
    }
    if (req.query.startDate || req.query.endDate) {
      whereClause.expense_date = {};
      if (req.query.startDate) {
        whereClause.expense_date[Op.gte] = new Date(`${req.query.startDate}T00:00:00.000Z`);
      }
      if (req.query.endDate) {
        whereClause.expense_date[Op.lte] = new Date(`${req.query.endDate}T23:59:59.999Z`);
      }
    }

    const { count, rows } = await expense.findAndCountAll({
      where: whereClause,
      order: [["expense_date", "DESC"], ["createdAt", "DESC"]],
      offset,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getExpenseSummary = async (req, res) => {
  try {
    const grouped = await expense.findAll({
      attributes: [
        "status",
        [expense.sequelize.fn("COUNT", expense.sequelize.col("expense_id")), "count"],
        [expense.sequelize.fn("SUM", expense.sequelize.col("amount")), "total"],
      ],
      group: ["status"],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: grouped.map((item) => ({
        status: item.status,
        count: Number(item.count || 0),
        total: Number(item.total || 0),
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};