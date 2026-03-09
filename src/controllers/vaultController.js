const { account, bankAcc, drawerAcc, trasactions } = require("../models");
const generateId = require("../helpers/idGen");
const { Op } = require("sequelize");

// Create a new vault
exports.createVault = async (req, res) => {
  try {
    const {
      type,
      drawer_name,
      drawer_location,
      bank_name,
      branch_name,
      account_number,
      account_holder_name,
    } = req.body;

    if(!type){
        return res.status(400).json({
            success: false,
            error: "Vault type is required",
        });
    }

    if (type === "bank") {
      if (
        !bank_name ||
        !branch_name ||
        !account_number ||
        !account_holder_name
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Bank name, branch name, account number, and account holder name are required for bank vaults",
        });
      }
      const newAccount = await account.create({
        acc_id: await generateId("ACCOUNT"),
        type,
        available_balance: 0.0,
      });
      const newBankAcc = await bankAcc.create({
        bank_acc_id: await generateId("BANK"),
        acc_id: newAccount.acc_id,
        bank_name,
        branch_name,
        account_number,
        account_holder_name,
        added_date: new Date(),
      });

      return res.status(201).json({
        success: true,
        message: "Bank vault created successfully",
        vault: {
          acc_id: newAccount.acc_id,
          type: newAccount.type,
          available_balance: newAccount.available_balance,
          bank_acc_id: newBankAcc.bank_acc_id,
          bank_name: newBankAcc.bank_name,
          branch_name: newBankAcc.branch_name,
          account_number: newBankAcc.account_number,
          account_holder_name: newBankAcc.account_holder_name,
          added_date: newBankAcc.added_date,
        },
      });
    } else if (type === "drawer") {
      if (!drawer_name || !drawer_location) {
        return res.status(400).json({
          success: false,
          error: "Type, drawer name, and drawer location are required",
        });
      }

      const newAccount = await account.create({
        acc_id: await generateId("ACCOUNT"),
        type,
        available_balance: 0.0,
      });
      const newDrawerAcc = await drawerAcc.create({
        drawer_acc_id: await generateId("DRAWER"),
        acc_id: newAccount.acc_id,
        name: drawer_name,
        location: drawer_location,
        added_date: new Date(),
      });
      return res.status(201).json({
        success: true,
        message: "Drawer vault created successfully",
        vault: {
          acc_id: newAccount.acc_id,
          type: newAccount.type,
          available_balance: newAccount.available_balance,
          drawer_acc_id: newDrawerAcc.drawer_acc_id,
          name: newDrawerAcc.name,
          location: newDrawerAcc.location,
          added_date: newDrawerAcc.added_date,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid vault type. Must be 'bank' or 'drawer'",
      });
    }
  } catch (error) {
    console.error("Error creating vault:", error);
    if (error.message) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: "Failed to create vault" });
    }
  }
};

// Get all vault accounts for dropdowns/selection
exports.getVaultAccounts = async (req, res) => {
  try {
    const accounts = await account.findAll({
      order: [["createdAt", "DESC"]],
    });

    const accountIds = accounts.map((item) => item.acc_id);

    if (!accountIds.length) {
      return res.status(200).json({
        success: true,
        accounts: [],
      });
    }

    const [banks, drawers] = await Promise.all([
      bankAcc.findAll({ where: { acc_id: { [Op.in]: accountIds } } }),
      drawerAcc.findAll({ where: { acc_id: { [Op.in]: accountIds } } }),
    ]);

    const bankByAccId = new Map(banks.map((item) => [item.acc_id, item]));
    const drawerByAccId = new Map(drawers.map((item) => [item.acc_id, item]));

    const vaultAccounts = accounts.map((item) => {
      const bank = bankByAccId.get(item.acc_id);
      const drawer = drawerByAccId.get(item.acc_id);

      if (item.type === "bank") {
        return {
          account_id: item.acc_id,
          account_type: item.type,
          available_balance: item.available_balance,
          bank_acc_id: bank?.bank_acc_id || null,
          bank_name: bank?.bank_name || null,
          branch_name: bank?.branch_name || null,
          account_number: bank?.account_number || null,
          account_holder_name: bank?.account_holder_name || null,
          display_name: `${bank?.bank_name || "Bank"} (${bank?.account_number || "N/A"})`,
        };
      }

      return {
        account_id: item.acc_id,
        account_type: item.type,
        available_balance: item.available_balance,
        drawer_acc_id: drawer?.drawer_acc_id || null,
        name: drawer?.name || null,
        location: drawer?.location || null,
        display_name: `${drawer?.name || "Drawer"} (${drawer?.location || "N/A"})`,
      };
    });

    return res.status(200).json({
      success: true,
      accounts: vaultAccounts,
    });
  } catch (error) {
    console.error("Error fetching vault accounts:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch vault accounts",
    });
  }
};

// New Transaction
exports.createNewTransaction = async (req, res) => {
  try {
    const { account_id, type, amount, description } = req.body;

    if (!account_id || !type || !amount) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Account ID, type, and amount are required",
        });
    }

    const acc = await account.findOne({ where: { acc_id: account_id } });
    if (!acc) {
      return res
        .status(404)
        .json({ success: false, error: "Account not found" });
    }

    const numericAmount = parseFloat(amount);

    const newTransaction = await trasactions.create({
      transaction_id: await generateId("TRANS"),
      amount: numericAmount,
      account_id,
      type,
      description,
      transaction_date: new Date(),
      account_balance_before: acc.available_balance,
      account_balance_after:
        type === "credit"
          ? parseFloat(acc.available_balance) + numericAmount
          : parseFloat(acc.available_balance) - numericAmount,
    });

    // Update account balance
    if (type === "credit") {
      acc.available_balance = parseFloat(acc.available_balance) + numericAmount;
    } else if (type === "debit") {
      acc.available_balance = parseFloat(acc.available_balance) - numericAmount;
    }

    await acc.save();

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction: {
        transaction_id: newTransaction.transaction_id,
        account_id: newTransaction.account_id,
        type: newTransaction.type,
        amount: newTransaction.amount,
        description: newTransaction.description,
        transaction_date: newTransaction.transaction_date,
      },
      updated_balance: acc.available_balance,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    if (error.message) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res
        .status(500)
        .json({ success: false, error: "Failed to create transaction" });
    }
  }
};

// Get all total vault balance
exports.getTotalVaultBalance = async (req, res) => {
  try {
    const totalBalance = await account.sum("available_balance");

    // total credit
    const totalCredit = await trasactions.sum("amount", {
      where: { type: "credit" },
    });

    // total debit
    const totalDebit = await trasactions.sum("amount", {
      where: { type: "debit" },
    });

    res.status(200).json({
      success: true,
      totalBalance,
      totalCredit,
      totalDebit,
    });
  } catch (error) {
    console.error("Error fetching total vault balance:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch total vault balance" });
  }
};

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const limit = 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const { count, rows } = await trasactions.findAndCountAll({
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      totalRecords: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      transactions: rows,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch transactions" });
  }
};

// Get transaction history for a specific account with pagination
exports.getTransactionHistory = async (req, res) => {
  try {
    const { account_id } = req.params;

    const limit = 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const acc = await account.findOne({ where: { acc_id: account_id } });

    if (!acc) {
      return res.status(404).json({
        success: false,
        error: "Account not found",
      });
    }

    const { count, rows } = await trasactions.findAndCountAll({
      where: { account_id },
      order: [["transaction_date", "DESC"]],
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      totalRecords: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      transactions: rows,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction history",
    });
  }
};

// Get Bank Account (Vault)
exports.getBankAccount = async (req, res) => {
  try {
    const { bank_acc_id } = req.params;

    const bankAccount = await bankAcc.findOne({
      where: { bank_acc_id },
      include: [
        {
          model: account,
          as: "account",
        },
      ],
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: "Bank account not found",
      });
    }

    res.status(200).json({
      success: true,
      vault: bankAccount,
    });
  } catch (error) {
    console.error("Error fetching bank account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bank account",
    });
  }
};

// Edit Bank Account (Vault)
exports.editBankAccount = async (req, res) => {
  try {
    const { bank_acc_id } = req.params;
    const { bank_name, branch_name, account_number, account_holder_name } = req.body;

    const bankAccount = await bankAcc.findOne({ where: { bank_acc_id } });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: "Bank account not found",
      });
    }

    // Update fields if provided
    if (bank_name !== undefined) bankAccount.bank_name = bank_name;
    if (branch_name !== undefined) bankAccount.branch_name = branch_name;
    if (account_number !== undefined) bankAccount.account_number = account_number;
    if (account_holder_name !== undefined) bankAccount.account_holder_name = account_holder_name;

    await bankAccount.save();

    res.status(200).json({
      success: true,
      message: "Bank account updated successfully",
      vault: bankAccount,
    });
  } catch (error) {
    console.error("Error updating bank account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update bank account",
    });
  }
};

// Delete Bank Account (Vault)
exports.deleteBankAccount = async (req, res) => {
  try {
    const { bank_acc_id } = req.params;

    const bankAccount = await bankAcc.findOne({ where: { bank_acc_id } });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        error: "Bank account not found",
      });
    }

    const acc_id = bankAccount.acc_id;

    // Check if there are any transactions associated with this account
    const transactionCount = await trasactions.count({
      where: { account_id: acc_id },
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete bank account with existing transactions",
      });
    }

    // Delete bank account first
    await bankAccount.destroy();

    // Delete associated account
    await account.destroy({ where: { acc_id } });

    res.status(200).json({
      success: true,
      message: "Bank account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete bank account",
    });
  }
};

// Get Drawer Account (Vault)
exports.getDrawerAccount = async (req, res) => {
  try {
    const { drawer_acc_id } = req.params;

    const drawerAccount = await drawerAcc.findOne({
      where: { drawer_acc_id },
      include: [
        {
          model: account,
          as: "account",
        },
      ],
    });

    if (!drawerAccount) {
      return res.status(404).json({
        success: false,
        error: "Drawer account not found",
      });
    }

    res.status(200).json({
      success: true,
      vault: drawerAccount,
    });
  } catch (error) {
    console.error("Error fetching drawer account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch drawer account",
    });
  }
};

// Edit Drawer Account (Vault)
exports.editDrawerAccount = async (req, res) => {
  try {
    const { drawer_acc_id } = req.params;
    const { name, location } = req.body;

    const drawerAccount = await drawerAcc.findOne({ where: { drawer_acc_id } });

    if (!drawerAccount) {
      return res.status(404).json({
        success: false,
        error: "Drawer account not found",
      });
    }

    // Update fields if provided
    if (name !== undefined) drawerAccount.name = name;
    if (location !== undefined) drawerAccount.location = location;

    await drawerAccount.save();

    res.status(200).json({
      success: true,
      message: "Drawer account updated successfully",
      vault: drawerAccount,
    });
  } catch (error) {
    console.error("Error updating drawer account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update drawer account",
    });
  }
};

// Delete Drawer Account (Vault)
exports.deleteDrawerAccount = async (req, res) => {
  try {
    const { drawer_acc_id } = req.params;

    const drawerAccount = await drawerAcc.findOne({ where: { drawer_acc_id } });

    if (!drawerAccount) {
      return res.status(404).json({
        success: false,
        error: "Drawer account not found",
      });
    }

    const acc_id = drawerAccount.acc_id;

    // Check if there are any transactions associated with this account
    const transactionCount = await trasactions.count({
      where: { account_id: acc_id },
    });

    if (transactionCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete drawer account with existing transactions",
      });
    }

    // Delete drawer account first
    await drawerAccount.destroy();

    // Delete associated account
    await account.destroy({ where: { acc_id } });

    res.status(200).json({
      success: true,
      message: "Drawer account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting drawer account:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete drawer account",
    });
  }
};

// Update Transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    const { amount, type, description } = req.body;

    const transaction = await trasactions.findOne({ where: { transaction_id } });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    const acc = await account.findOne({ where: { acc_id: transaction.account_id } });

    if (!acc) {
      return res.status(404).json({
        success: false,
        error: "Associated account not found",
      });
    }

    // Reverse the old transaction from account balance
    if (transaction.type === "credit") {
      acc.available_balance -= parseFloat(transaction.amount);
    } else if (transaction.type === "debit") {
      acc.available_balance += parseFloat(transaction.amount);
    }

    // Update transaction fields
    if (amount !== undefined) transaction.amount = amount;
    if (type !== undefined) transaction.type = type;
    if (description !== undefined) transaction.description = description;

    // Apply the new transaction to account balance
    const newAmount = parseFloat(transaction.amount);
    if (transaction.type === "credit") {
      acc.available_balance += newAmount;
    } else if (transaction.type === "debit") {
      acc.available_balance -= newAmount;
    }

    // Update balance tracking in transaction
    transaction.account_balance_after = acc.available_balance;

    await transaction.save();
    await acc.save();

    res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      transaction: transaction,
      updated_balance: acc.available_balance,
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update transaction",
    });
  }
};

// Delete Transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { transaction_id } = req.params;

    const transaction = await trasactions.findOne({ where: { transaction_id } });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transaction not found",
      });
    }

    const acc = await account.findOne({ where: { acc_id: transaction.account_id } });

    if (!acc) {
      return res.status(404).json({
        success: false,
        error: "Associated account not found",
      });
    }

    // Reverse the transaction from account balance
    if (transaction.type === "credit") {
      acc.available_balance -= parseFloat(transaction.amount);
    } else if (transaction.type === "debit") {
      acc.available_balance += parseFloat(transaction.amount);
    }

    await acc.save();
    await transaction.destroy();

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      updated_balance: acc.available_balance,
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete transaction",
    });
  }
};
