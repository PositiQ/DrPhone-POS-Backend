const { account, bankAcc, drawerAcc, trasactions } = require("../models");
const generateId = require("../helpers/idGen");

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

    if (!type || !drawer_name || !drawer_location) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Type, drawer name, and drawer location are required",
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
        acc_id: generateId("ACCOUNT"),
        type,
        available_balance: 0.0,
      });
      const newBankAcc = await bankAcc.create({
        bank_acc_id: generateId("BANK"),
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
      const newAccount = await account.create({
        acc_id: generateId("ACCOUNT"),
        type,
        available_balance: 0.0,
      });
      const newDrawerAcc = await drawerAcc.create({
        drawer_acc_id: generateId("DRAWER"),
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
      return res
        .status(400)
        .json({
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

// New Transaction
exports.createNewTransaction = async (req, res) => {
  try {
    const { account_id, type, amount, description } = req.body;


    if (!account_id || !type || !amount) {
        return res
            .status(400)
            .json({ success: false, error: "Account ID, type, and amount are required" });
    }

    const account = await account.findOne({ where: { acc_id } });
    if (!account) {
        return res.status(404).json({ success: false, error: "Account not found" });
    }

    const newTransaction = await trasactions.create({
        transaction_id: generateId("TRANS"),
        amount,
        account_id,
        type,
        description,
        transaction_date: new Date(),
        account_balance_before: account.available_balance,
        account_balance_after: type === "credit" ? parseFloat(account.available_balance) + parseFloat(amount) : parseFloat(account.available_balance) - parseFloat(amount),
    });


    // Update account balance
    if (type === "credit") {
        account.available_balance += amount;
    } else if (type === "debit") {
        account.available_balance -= amount;
    }
    
    await account.save();

    res.status(201).json({
        success: true,
        message: "Transaction created successfully",
        transaction: {
            transaction_id: newTransaction.transaction_id,
            acc_id: newTransaction.acc_id,
            type: newTransaction.type,
            amount: newTransaction.amount,
            description: newTransaction.description,
            date: newTransaction.date,
        },
        updated_balance: account.available_balance,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    if (error.message) {
        res.status(400).json({ success: false, error: error.message });
    } else {
        res.status(500).json({ success: false, error: "Failed to create transaction" });
    }
    }
};
