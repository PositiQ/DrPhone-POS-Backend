const {
  Product_Stock,
  Stock_Issues,
  shop,
  Product,
  shopSales,
  account,
  drawerAcc,
  trasactions,
  customer,
  customer_sales,
  sales,
  sequelize,
} = require("../models");
const generateId = require("../helpers/idGen");

async function resolveVaultAccount(accountId, transaction) {
  if (accountId) {
    const selected = await account.findOne({
      where: { acc_id: accountId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (selected) return selected;
  }

  const latestDrawer = await account.findOne({
    where: { type: "drawer" },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (latestDrawer) return latestDrawer;

  const anyAccount = await account.findOne({
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (anyAccount) return anyAccount;

  // Ensure a valid vault target exists so sold/settled flows always create a transaction.
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

async function createCreditTransaction({ accountRow, amount, description, transaction }) {
  const numericAmount = Number(amount || 0);
  if (!accountRow || numericAmount <= 0) return null;

  const beforeBalance = Number(accountRow.available_balance || 0);
  const afterBalance = beforeBalance + numericAmount;

  const transactionRow = await trasactions.create({
    transaction_id: await generateId("TRANS", transaction),
    amount: numericAmount,
    account_id: accountRow.acc_id,
    type: "credit",
    description,
    transaction_date: new Date(),
    account_balance_before: beforeBalance,
    account_balance_after: afterBalance,
  }, { transaction });

  await accountRow.update({ available_balance: afterBalance }, { transaction });
  return transactionRow;
}

async function resolveShopOwner(shopId, transaction) {
  const shopRecord = await shop.findByPk(shopId, {
    transaction,
    attributes: ["shop_id", "owner_customer_id", "name"],
  });

  const ownerCustomerId = shopRecord?.owner_customer_id;
  if (!ownerCustomerId) return { shopRecord, ownerCustomerId: null };

  const owner = await customer.findByPk(ownerCustomerId, {
    transaction,
    attributes: ["customer_id"],
  });

  return {
    shopRecord,
    ownerCustomerId: owner ? ownerCustomerId : null,
  };
}

async function syncOwnerSaleForIssue({ issue, nextStatus, paymentMethod, transaction }) {
  const numericAmount = Number(issue?.issued_stock || 0) * Number(issue?.selling_price || 0);
  if (numericAmount <= 0) {
    return { ownerCustomerId: null, saleId: null };
  }

  const { ownerCustomerId } = await resolveShopOwner(issue.issued_shop_id, transaction);
  if (!ownerCustomerId) {
    return { ownerCustomerId: null, saleId: null };
  }

  const normalizedStatus = String(nextStatus || issue.status || "pending_payment").toLowerCase();
  const isSold = normalizedStatus === "sold";
  const normalizedPaymentMethod = isSold
    ? String(paymentMethod || "cash").toLowerCase()
    : "credit";
  const saleStatus = isSold ? "completed" : "pending";

  let ownerSale = null;
  if (issue.linked_sales_id) {
    ownerSale = await sales.findOne({
      where: {
        sales_id: issue.linked_sales_id,
        customer_id: ownerCustomerId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  if (ownerSale) {
    await ownerSale.update({
      total_amount: Number(numericAmount.toFixed(2)),
      payment_method: normalizedPaymentMethod,
      status: saleStatus,
      sales_date: new Date(),
    }, { transaction });
  } else {
    ownerSale = await sales.create({
      sales_id: await generateId("SALE", transaction),
      customer_id: ownerCustomerId,
      total_discount: 0,
      total_amount: Number(numericAmount.toFixed(2)),
      sales_date: new Date(),
      payment_method: normalizedPaymentMethod,
      status: saleStatus,
    }, { transaction });

    await issue.update({ linked_sales_id: ownerSale.sales_id }, { transaction });
  }

  return {
    ownerCustomerId,
    saleId: ownerSale.sales_id,
    amount: Number(numericAmount.toFixed(2)),
    saleStatus,
  };
}

async function addCustomerSalesLedger({ customerId, amount, paid, transaction }) {
  const numericAmount = Number(amount || 0);
  if (!customerId || numericAmount <= 0) return null;

  return customer_sales.create({
    customer_id: customerId,
    total_sales_amount: Number(numericAmount.toFixed(2)),
    last_sales_date: new Date(),
    is_due_available: !paid,
    paid_amount: paid ? Number(numericAmount.toFixed(2)) : 0,
    payment_status: paid ? "paid" : "pending",
  }, { transaction });
}

// Issue a stock item
exports.issueStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { product_id, issued_shop_id, issued_stock, selling_price, payment_status, payment_method, account_id } = req.body;

    const incomingStatus = String(payment_status || "pending_payment").toLowerCase();
    const status = incomingStatus === "paid" ? "sold" : incomingStatus;

    if (!["pending_payment", "sold"].includes(status)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid payment_status. Use pending_payment or sold." });
    }

    const amount = issued_stock * selling_price;
    const isPaid = status === "sold";

    const [productStock, shopExists] = await Promise.all([
      Product_Stock.findOne({
        where: { product_id },
        transaction: t,
        lock: t.LOCK.UPDATE
      }),
      shop.findByPk(issued_shop_id, { transaction: t })
    ]);

    if (!productStock) {
      await t.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    if (!shopExists) {
      await t.rollback();
      return res.status(404).json({ message: "Shop not found" });
    }

    if (productStock.quantity_in_stock < issued_stock) {
      await t.rollback();
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const shopName = shopExists.name;

    const issueStock = await Stock_Issues.create({
      product_id,
      issued_to: shopName,
      issued_shop_id,
      issued_stock,
      selling_price,
      status
    }, { transaction: t });

    const [sales] = await shopSales.findOrCreate({
      where: { shop_id: issued_shop_id },
      defaults: {
        shop_id: issued_shop_id,
        total_sales: 0,
        total_paid: 0,
        total_outstanding: 0,
        total_devices: 0,
        active_devices: 0,
        sold_devices: 0
      },
      transaction: t
    });

    await sales.increment({
      total_sales: 1,
      total_devices: issued_stock,
      active_devices: isPaid ? 0 : issued_stock,
      sold_devices: isPaid ? issued_stock : 0,
      total_paid: isPaid ? amount : 0,
      total_outstanding: isPaid ? 0 : amount
    }, { transaction: t });

    await productStock.update({
      quantity_in_stock: productStock.quantity_in_stock - issued_stock,
      status: "issued",
      // Product_Stock tracks main-shop remaining quantity, not issued units.
      storage_location: "Main Shop"
    }, { transaction: t });

    const ownerSaleSync = await syncOwnerSaleForIssue({
      issue: issueStock,
      nextStatus: status,
      paymentMethod: payment_method,
      transaction: t,
    });

    await addCustomerSalesLedger({
      customerId: ownerSaleSync.ownerCustomerId,
      amount,
      paid: isPaid,
      transaction: t,
    });

    let transactionInfo = null;
    if (isPaid) {
      const vaultAccount = await resolveVaultAccount(account_id, t);
      const txn = await createCreditTransaction({
        accountRow: vaultAccount,
        amount,
        description: `Direct sold issue for shop ${shopName} (${issued_shop_id})`,
        transaction: t,
      });

      if (txn) {
        transactionInfo = {
          transaction_id: txn.transaction_id,
          account_id: txn.account_id,
          amount: Number(txn.amount || 0),
        };
      }
    }

    await t.commit();

    res.status(200).json({
      success: true,
      message: "Stock issued successfully",
      data: issueStock,
      transaction: transactionInfo,
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error issuing stock",
      error: error.message
    });
  }
};

exports.getAllStockIssues = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;
    const { shop_id, status } = req.query;

    const whereClause = {};
    if (shop_id) whereClause.issued_shop_id = shop_id;
    if (status) whereClause.status = status;

    const { count, rows } = await Stock_Issues.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],

      include: [
        {
          model: Product_Stock,
          attributes: [
            "selling_price",
            "wholesale_price",
            "storage_location",
            "status"
          ],
          include: [
            {
              model: Product,
              attributes: [
                "productName",
                "capacity",
                "color",
                "IMEI"
              ]
            }
          ]
        },
        {
          model: shop,
          as: "shop",
          attributes: ["name"]
        }
      ]
    });

    const formattedData = rows.map(issue => ({
      id: issue.id,
      issued_shop_id: issue.issued_shop_id,
      issued_stock: issue.issued_stock,
      selling_price: issue.selling_price,
      issue_amount: Number(issue.issued_stock || 0) * Number(issue.selling_price || 0),
      outstanding_amount: String(issue.status || '').toLowerCase() === 'sold'
        ? 0
        : Number(issue.issued_stock || 0) * Number(issue.selling_price || 0),

      product_name: issue.Product_Stock?.Product?.productName || null,
      price: issue.Product_Stock?.selling_price || null,
      wholesale_price: issue.Product_Stock?.wholesale_price || null,

      capacity: issue.Product_Stock?.Product?.capacity || null,
      color: issue.Product_Stock?.Product?.color || null,
      IMEI: issue.Product_Stock?.Product?.IMEI || null,

      stock_status: issue.Product_Stock?.status || null,
      issue_status: issue.status || "not issued",

      storage_location: issue.Product_Stock?.storage_location || null,
      issued_to: issue.shop?.name || null,

      issued_date: issue.createdAt || null
    }));

    res.status(200).json({
      success: true,
      message: "Stock issues retrieved successfully",

      pagination: {
        total_records: count,
        total_pages: Math.ceil(count / limit),
        current_page: page,
        per_page: limit
      },

      data: formattedData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching stock issues",
      error: error.message
    });
  }
};

exports.getShopStockIssues = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status } = req.query;

    const whereClause = { issued_shop_id: shopId };
    if (status) {
      whereClause.status = status;
    }

    const issues = await Stock_Issues.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Product_Stock,
          attributes: ["status"],
          include: [
            {
              model: Product,
              attributes: ["productName", "capacity", "color", "IMEI"],
            },
          ],
        },
        {
          model: shop,
          as: "shop",
          attributes: ["shop_id", "name"],
        },
      ],
    });

    const data = issues.map((issue) => ({
      id: issue.id,
      issued_shop_id: issue.issued_shop_id,
      issued_stock: issue.issued_stock,
      selling_price: Number(issue.selling_price || 0),
      issue_amount: Number(issue.issued_stock || 0) * Number(issue.selling_price || 0),
      status: issue.status,
      product_name: issue.Product_Stock?.Product?.productName || null,
      capacity: issue.Product_Stock?.Product?.capacity || null,
      color: issue.Product_Stock?.Product?.color || null,
      IMEI: issue.Product_Stock?.Product?.IMEI || null,
      issued_to: issue.shop?.name || issue.issued_to || null,
      issued_date: issue.createdAt || null,
    }));

    res.status(200).json({
      success: true,
      data,
      stats: {
        count: data.length,
        outstanding_amount: data
          .filter((item) => String(item.status).toLowerCase() !== 'sold')
          .reduce((sum, item) => sum + Number(item.issue_amount || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching shop stock issues",
      error: error.message,
    });
  }
};

exports.settleShopPayments = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { shopId } = req.params;
    const settlementType = String(req.body.type || 'full').toLowerCase();
    const accountId = req.body.account_id;
    const paymentMethod = req.body.payment_method;

    if (!['full', 'half'].includes(settlementType)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid settlement type. Use full or half.',
      });
    }

    const pendingIssues = await Stock_Issues.findAll({
      where: {
        issued_shop_id: shopId,
        status: 'pending_payment',
      },
      order: [["createdAt", "ASC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!pendingIssues.length) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No pending payments found for this shop.',
      });
    }

    const totalOutstanding = pendingIssues.reduce(
      (sum, issue) => sum + (Number(issue.issued_stock || 0) * Number(issue.selling_price || 0)),
      0
    );

    const targetAmount = settlementType === 'full' ? totalOutstanding : totalOutstanding / 2;

    let settledAmount = 0;
    let settledDevices = 0;
    const issueIdsToSettle = [];

    for (const issue of pendingIssues) {
      const issueAmount = Number(issue.issued_stock || 0) * Number(issue.selling_price || 0);

      if (settlementType === 'full') {
        issueIdsToSettle.push(issue.id);
        settledAmount += issueAmount;
        settledDevices += Number(issue.issued_stock || 0);
        continue;
      }

      if (settledAmount + issueAmount <= targetAmount || issueIdsToSettle.length === 0) {
        issueIdsToSettle.push(issue.id);
        settledAmount += issueAmount;
        settledDevices += Number(issue.issued_stock || 0);
      } else {
        break;
      }
    }

    const issueIdSet = new Set(issueIdsToSettle);
    const issuesToSettle = pendingIssues.filter((issue) => issueIdSet.has(issue.id));

    for (const issue of issuesToSettle) {
      await issue.update({ status: 'sold' }, { transaction: t });

      const ownerSaleSync = await syncOwnerSaleForIssue({
        issue,
        nextStatus: 'sold',
        paymentMethod,
        transaction: t,
      });

      await addCustomerSalesLedger({
        customerId: ownerSaleSync.ownerCustomerId,
        amount: ownerSaleSync.amount,
        paid: true,
        transaction: t,
      });
    }

    const [sales] = await shopSales.findOrCreate({
      where: { shop_id: shopId },
      defaults: {
        shop_id: shopId,
        total_sales: 0,
        total_paid: 0,
        total_outstanding: 0,
        total_devices: 0,
        active_devices: 0,
        sold_devices: 0,
      },
      transaction: t,
    });

    await sales.increment({
      active_devices: -settledDevices,
      sold_devices: settledDevices,
      total_paid: settledAmount,
      total_outstanding: -settledAmount,
    }, { transaction: t });

    await sales.reload({ transaction: t });
    await sales.update({
      active_devices: Math.max(Number(sales.active_devices || 0), 0),
      total_outstanding: Math.max(Number(sales.total_outstanding || 0), 0),
    }, { transaction: t });

    const shopRecord = await shop.findByPk(shopId, {
      transaction: t,
      attributes: ["name", "shop_id"],
    });

    const vaultAccount = await resolveVaultAccount(accountId, t);
    const txn = await createCreditTransaction({
      accountRow: vaultAccount,
      amount: settledAmount,
      description: `${settlementType === 'full' ? 'Full' : 'Half'} settlement for shop ${shopRecord?.name || shopId} (${shopRecord?.shop_id || shopId})`,
      transaction: t,
    });

    const transactionMeta = txn
      ? {
          recorded: true,
          transaction_id: txn.transaction_id,
          account_id: txn.account_id,
          amount: Number(txn.amount || 0),
        }
      : {
          recorded: false,
          reason: "No vault account available for automatic transaction",
        };

    await t.commit();

    return res.status(200).json({
      success: true,
      message: settlementType === 'full'
        ? 'Full settlement completed successfully'
        : 'Half settlement completed successfully',
      data: {
        type: settlementType,
        issues_settled: issueIdsToSettle.length,
        devices_settled: settledDevices,
        amount_settled: settledAmount,
        previous_outstanding: totalOutstanding,
        remaining_outstanding: Math.max(totalOutstanding - settledAmount, 0),
        transaction: transactionMeta,
      },
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      message: 'Error settling shop payments',
      error: error.message,
    });
  }
};

exports.completeStockIssueSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const issueId = req.params.id;
    const accountId = req.body?.account_id;
    const paymentMethod = req.body?.payment_method;

    const issue = await Stock_Issues.findByPk(issueId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!issue) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Stock issue not found' });
    }

    if (String(issue.status).toLowerCase() === 'sold') {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Sale already completed' });
    }

    const issuedStock = Number(issue.issued_stock || 0);
    const sellingPrice = Number(issue.selling_price || 0);
    const amount = issuedStock * sellingPrice;

    const [sales] = await shopSales.findOrCreate({
      where: { shop_id: issue.issued_shop_id },
      defaults: {
        shop_id: issue.issued_shop_id,
        total_sales: 0,
        total_paid: 0,
        total_outstanding: 0,
        total_devices: 0,
        active_devices: 0,
        sold_devices: 0,
      },
      transaction: t,
    });

    await issue.update({ status: 'sold' }, { transaction: t });

    await sales.increment({
      active_devices: -issuedStock,
      sold_devices: issuedStock,
      total_paid: amount,
      total_outstanding: -amount,
    }, { transaction: t });

    await sales.reload({ transaction: t });

    // Guard against legacy drift creating negative counters.
    await sales.update({
      active_devices: Math.max(Number(sales.active_devices || 0), 0),
      total_outstanding: Math.max(Number(sales.total_outstanding || 0), 0),
    }, { transaction: t });

    const shopRecord = await shop.findByPk(issue.issued_shop_id, {
      transaction: t,
      attributes: ["name", "shop_id"],
    });

    const vaultAccount = await resolveVaultAccount(accountId, t);
    const txn = await createCreditTransaction({
      accountRow: vaultAccount,
      amount,
      description: `Completed issue sale for shop ${shopRecord?.name || issue.issued_shop_id} (${shopRecord?.shop_id || issue.issued_shop_id})`,
      transaction: t,
    });

    const transactionMeta = txn
      ? {
          recorded: true,
          transaction_id: txn.transaction_id,
          account_id: txn.account_id,
          amount: Number(txn.amount || 0),
        }
      : {
          recorded: false,
          reason: "No vault account available for automatic transaction",
        };

    const ownerSaleSync = await syncOwnerSaleForIssue({
      issue,
      nextStatus: 'sold',
      paymentMethod,
      transaction: t,
    });

    await addCustomerSalesLedger({
      customerId: ownerSaleSync.ownerCustomerId,
      amount: ownerSaleSync.amount,
      paid: true,
      transaction: t,
    });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Sale marked as completed',
      data: issue,
      transaction: transactionMeta,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      message: 'Error completing sale',
      error: error.message,
    });
  }
};
