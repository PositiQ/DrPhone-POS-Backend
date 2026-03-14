const {
  supplier,
  supplierPurchase,
  supplierPurchaseItem,
  supplierPayment,
  supplierCheque,
  Product,
  Product_Stock,
  account,
  drawerAcc,
  trasactions,
} = require("../models");
const generateId = require("../helpers/idGen");
const { Op } = require("sequelize");

function normalizePaymentMethod(value) {
  const method = String(value || "").toLowerCase();
  if (["cash", "bank_transfer", "cheque"].includes(method)) {
    return method;
  }
  return "cash";
}

function getAccountTypeFromPaymentMethod(method) {
  return normalizePaymentMethod(method) === "cash" ? "drawer" : "bank";
}

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getChequeFlagFromDueDate(dueDate, status) {
  const normalizedStatus = String(status || "pending").toLowerCase();
  if (normalizedStatus === "cleared" || normalizedStatus === "bounced") {
    return normalizedStatus;
  }

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - todayStart().getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays <= 5) return "due_soon";
  return "pending";
}

async function syncChequeStatus(chequeRows, transaction) {
  for (const cheque of chequeRows) {
    const flag = getChequeFlagFromDueDate(cheque.due_date, cheque.status);
    if (flag === "overdue" && cheque.status === "pending") {
      await cheque.update({ status: "overdue" }, { transaction });
      cheque.setDataValue("status", "overdue");
    }
    cheque.setDataValue("flag", flag);
  }
}

async function resolveSupplierAccount(accountId, paymentMethod, transaction) {
  if (accountId) {
    const selected = await account.findOne({
      where: { acc_id: accountId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (selected) {
      return selected;
    }
  }

  const preferredType = getAccountTypeFromPaymentMethod(paymentMethod);

  const preferred = await account.findOne({
    where: { type: preferredType },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (preferred) {
    return preferred;
  }

  const anyAccount = await account.findOne({
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (anyAccount) {
    return anyAccount;
  }

  const defaultAccount = await account.create(
    {
      acc_id: await generateId("ACCOUNT", transaction),
      type: "drawer",
      available_balance: 0,
    },
    { transaction }
  );

  await drawerAcc.create(
    {
      drawer_acc_id: await generateId("DRAWER", transaction),
      acc_id: defaultAccount.acc_id,
      name: "System Drawer",
      location: "Main Shop",
      added_date: new Date(),
    },
    { transaction }
  );

  return defaultAccount;
}

async function createSupplierDebitTransaction({
  accountRow,
  amount,
  description,
  transaction,
}) {
  const numericAmount = toNumber(amount);
  if (!accountRow || numericAmount <= 0) return null;

  const beforeBalance = toNumber(accountRow.available_balance);
  const afterBalance = beforeBalance - numericAmount;

  const transactionRow = await trasactions.create(
    {
      transaction_id: await generateId("TRANS", transaction),
      amount: numericAmount,
      account_id: accountRow.acc_id,
      type: "debit",
      description,
      transaction_date: new Date(),
      account_balance_before: beforeBalance,
      account_balance_after: afterBalance,
    },
    { transaction }
  );

  await accountRow.update({ available_balance: afterBalance }, { transaction });
  return transactionRow;
}

async function applyPaymentAgainstPurchases(supplierId, amount, transaction) {
  let remaining = toNumber(amount);

  const purchases = await supplierPurchase.findAll({
    where: {
      supplier_id: supplierId,
      balance_due: { [Op.gt]: 0 },
    },
    order: [["purchase_date", "ASC"], ["createdAt", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  for (const purchase of purchases) {
    if (remaining <= 0) break;

    const currentDue = toNumber(purchase.balance_due);
    if (currentDue <= 0) continue;

    const settled = Math.min(currentDue, remaining);
    const nextDue = Math.max(currentDue - settled, 0);
    const paidSoFar = toNumber(purchase.amount_paid) + settled;

    await purchase.update(
      {
        amount_paid: Number(paidSoFar.toFixed(2)),
        balance_due: Number(nextDue.toFixed(2)),
        status: nextDue <= 0 ? "paid" : "partial",
      },
      { transaction }
    );

    remaining -= settled;
  }
}

async function syncPurchasedProductToInventory(item, transaction) {
  const quantityToAdd = Math.max(1, toNumber(item.quantity_in_stock));
  const costPrice = Number(toNumber(item.cost_price).toFixed(2));
  const sellingPrice = Number((toNumber(item.selling_price) > 0 ? toNumber(item.selling_price) : costPrice).toFixed(2));

  let stockRow = await Product_Stock.findOne({
    where: { sku: item.sku },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (stockRow) {
    const nextQty = Math.max(0, toNumber(stockRow.quantity_in_stock)) + quantityToAdd;
    await stockRow.update(
      {
        cost_price: costPrice,
        selling_price: sellingPrice,
        supplier: item.supplier_name,
        quantity_in_stock: nextQty,
        storage_location: stockRow.storage_location || "Main Shop",
        status: "active",
      },
      { transaction }
    );

    const linkedProduct = await Product.findByPk(stockRow.product_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (linkedProduct) {
      await linkedProduct.update(
        {
          productName: item.product_name,
          brand: item.brand,
          model: item.model,
          color: item.color,
          capacity: item.storage_capacity,
          condition: item.condition,
          IMEI: item.imei_number,
          barcode: item.barcode,
          serialNumber: item.serial_number,
          price: sellingPrice,
          product_type: item.product_type.toLowerCase() === "phone" ? "phone" : "accessory",
        },
        { transaction }
      );
    }

    return { action: "updated", product_id: stockRow.product_id, sku: stockRow.sku, quantity_added: quantityToAdd };
  }

  const identityConditions = [];
  if (item.imei_number) identityConditions.push({ IMEI: item.imei_number });
  if (item.barcode) identityConditions.push({ barcode: item.barcode });
  if (item.serial_number) identityConditions.push({ serialNumber: item.serial_number });

  let productRow = null;
  if (identityConditions.length) {
    productRow = await Product.findOne({
      where: { [Op.or]: identityConditions },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  }

  if (!productRow) {
    productRow = await Product.create(
      {
        id: await generateId("PROD", transaction),
        productName: item.product_name,
        description: null,
        price: sellingPrice,
        brand: item.brand,
        model: item.model,
        color: item.color,
        capacity: item.storage_capacity,
        condition: item.condition,
        warrenty: null,
        IMEI: item.imei_number,
        barcode: item.barcode,
        serialNumber: item.serial_number,
        product_type: item.product_type.toLowerCase() === "phone" ? "phone" : "accessory",
      },
      { transaction }
    );
  } else {
    await productRow.update(
      {
        productName: item.product_name,
        brand: item.brand,
        model: item.model,
        color: item.color,
        capacity: item.storage_capacity,
        condition: item.condition,
        price: sellingPrice,
        product_type: item.product_type.toLowerCase() === "phone" ? "phone" : "accessory",
      },
      { transaction }
    );
  }

  const existingStockForProduct = await Product_Stock.findOne({
    where: { product_id: productRow.id },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (existingStockForProduct) {
    const nextQty = Math.max(0, toNumber(existingStockForProduct.quantity_in_stock)) + quantityToAdd;
    await existingStockForProduct.update(
      {
        cost_price: costPrice,
        selling_price: sellingPrice,
        supplier: item.supplier_name,
        quantity_in_stock: nextQty,
        storage_location: existingStockForProduct.storage_location || "Main Shop",
        status: "active",
      },
      { transaction }
    );

    return {
      action: "updated",
      product_id: productRow.id,
      sku: existingStockForProduct.sku,
      quantity_added: quantityToAdd,
    };
  }

  const createdStock = await Product_Stock.create(
    {
      product_id: productRow.id,
      sku: item.sku,
      cost_price: costPrice,
      selling_price: sellingPrice,
      wholesale_price: 0,
      profit_margin: null,
      supplier: item.supplier_name,
      minimum_stock_level: 1,
      quantity_in_stock: quantityToAdd,
      storage_location: "Main Shop",
      date_added: new Date(),
      status: "active",
    },
    { transaction }
  );

  return { action: "created", product_id: productRow.id, sku: createdStock.sku, quantity_added: quantityToAdd };
}

async function getComputedSupplierList({ search, status, payment_status }) {
  const whereClause = {};

  if (status) {
    whereClause.status = String(status).toLowerCase();
  }

  if (search) {
    const query = String(search).trim();
    if (query) {
      whereClause[Op.or] = [
        { supplier_id: { [Op.like]: `%${query}%` } },
        { name: { [Op.like]: `%${query}%` } },
        { contact_person: { [Op.like]: `%${query}%` } },
        { phone: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
      ];
    }
  }

  const suppliers = await supplier.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
  });

  const supplierIds = suppliers.map((row) => row.supplier_id);

  const [purchaseRows, chequeRows] = await Promise.all([
    supplierIds.length
      ? supplierPurchase.findAll({
          where: { supplier_id: { [Op.in]: supplierIds } },
          attributes: ["supplier_id", "total_amount", "balance_due", "status"],
        })
      : Promise.resolve([]),
    supplierIds.length
      ? supplierCheque.findAll({
          where: {
            supplier_id: { [Op.in]: supplierIds },
            status: { [Op.notIn]: ["cleared", "bounced"] },
          },
        })
      : Promise.resolve([]),
  ]);

  const purchaseStats = new Map();
  for (const purchase of purchaseRows) {
    const id = purchase.supplier_id;
    const current = purchaseStats.get(id) || {
      totalOrders: 0,
      totalPurchaseAmount: 0,
      outstanding: 0,
    };

    current.totalOrders += 1;
    current.totalPurchaseAmount += toNumber(purchase.total_amount);
    current.outstanding += toNumber(purchase.balance_due);
    purchaseStats.set(id, current);
  }

  const chequeStats = new Map();
  for (const cheque of chequeRows) {
    const id = cheque.supplier_id;
    const current = chequeStats.get(id) || {
      dueSoonCount: 0,
      overdueCount: 0,
    };

    const flag = getChequeFlagFromDueDate(cheque.due_date, cheque.status);
    if (flag === "due_soon") current.dueSoonCount += 1;
    if (flag === "overdue") current.overdueCount += 1;
    chequeStats.set(id, current);
  }

  const data = suppliers.map((row) => {
    const stats = purchaseStats.get(row.supplier_id) || {
      totalOrders: 0,
      totalPurchaseAmount: 0,
      outstanding: toNumber(row.outstanding_balance),
    };

    const cheque = chequeStats.get(row.supplier_id) || {
      dueSoonCount: 0,
      overdueCount: 0,
    };

    const outstanding = Number(stats.outstanding.toFixed(2));

    let computedPaymentStatus = "paid";
    if (cheque.overdueCount > 0) {
      computedPaymentStatus = "overdue";
    } else if (cheque.dueSoonCount > 0) {
      computedPaymentStatus = "due_soon";
    } else if (outstanding > 0) {
      computedPaymentStatus = "pending";
    }

    return {
      supplier_id: row.supplier_id,
      name: row.name,
      contact_person: row.contact_person,
      phone: row.phone,
      email: row.email,
      status: row.status,
      outstanding_balance: outstanding,
      total_orders: stats.totalOrders,
      total_purchase_amount: Number(stats.totalPurchaseAmount.toFixed(2)),
      payment_status: computedPaymentStatus,
      cheque_due_soon_count: cheque.dueSoonCount,
      cheque_overdue_count: cheque.overdueCount,
      last_purchase_date: row.last_purchase_date,
      last_payment_date: row.last_payment_date,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  if (!payment_status) return data;

  const normalized = String(payment_status).toLowerCase();
  return data.filter((row) => row.payment_status === normalized);
}

exports.createSupplier = async (req, res) => {
  const t = await supplier.sequelize.transaction();
  try {
    const name = String(req.body.name || "").trim();
    const contactPerson = String(req.body.contact_person || "").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim();
    const status = String(req.body.status || "active").toLowerCase();
    const notes = String(req.body.notes || "").trim();

    if (!name || !contactPerson || !phone) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Name, contact person, and phone are required",
      });
    }

    const existing = await supplier.findOne({
      where: { name },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existing) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        error: "Supplier with this name already exists",
      });
    }

    const created = await supplier.create(
      {
        supplier_id: await generateId("SUP", t),
        name,
        contact_person: contactPerson,
        phone,
        email: email || null,
        status: status === "inactive" ? "inactive" : "active",
        notes: notes || null,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
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

exports.updateSupplier = async (req, res) => {
  const t = await supplier.sequelize.transaction();
  try {
    const { id } = req.params;

    const row = await supplier.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        error: "Supplier not found",
      });
    }

    const payload = {};
    ["name", "contact_person", "phone", "email", "status", "notes"].forEach((field) => {
      if (req.body[field] !== undefined) {
        payload[field] = req.body[field];
      }
    });

    if (payload.status) {
      payload.status = String(payload.status).toLowerCase() === "inactive" ? "inactive" : "active";
    }

    await row.update(payload, { transaction: t });

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: row,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const data = await getComputedSupplierList({
      search: req.query.search,
      status: req.query.status,
      payment_status: req.query.payment_status,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getSuppliersSummary = async (req, res) => {
  try {
    const data = await getComputedSupplierList({});

    const totalSuppliers = data.length;
    const activeSuppliers = data.filter((item) => item.status === "active").length;
    const totalPayable = data.reduce((sum, item) => sum + toNumber(item.outstanding_balance), 0);
    const overduePayments = data.filter((item) => item.payment_status === "overdue").length;
    const dueSoonCheques = data.reduce((sum, item) => sum + toNumber(item.cheque_due_soon_count), 0);
    const overdueCheques = data.reduce((sum, item) => sum + toNumber(item.cheque_overdue_count), 0);

    return res.status(200).json({
      success: true,
      data: {
        total_suppliers: totalSuppliers,
        active_suppliers: activeSuppliers,
        total_payable: Number(totalPayable.toFixed(2)),
        overdue_payments: overduePayments,
        due_soon_cheques: dueSoonCheques,
        overdue_cheques: overdueCheques,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createSupplierPurchase = async (req, res) => {
  const t = await supplierPurchase.sequelize.transaction();
  try {
    const supplierId = String(req.body.supplier_id || "").trim();
    const paymentType = String(req.body.payment_type || "credit").toLowerCase();
    const paymentMethod = normalizePaymentMethod(req.body.payment_method);
    const note = String(req.body.note || "").trim();
    const accountId = String(req.body.account_id || "").trim();
    const products = Array.isArray(req.body.products) ? req.body.products : [];
    const rawAmountPaid = toNumber(req.body.amount_paid);

    if (!supplierId) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "supplier_id is required" });
    }

    if (!products.length) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "At least one product is required" });
    }

    const supplierRow = await supplier.findByPk(supplierId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!supplierRow) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Supplier not found" });
    }

    const normalizedProducts = products.map((item) => {
      const productName = String(item.productName || item.product_name || "").trim();
      const productTypeRaw = String(item.productType || item.product_type || "").trim();
      const productType = productTypeRaw.toLowerCase() === "phone" ? "Phone" : "Accessory";
      const brand = String(item.brand || "").trim();
      const quantity = Math.max(1, parseInt(item.quantityInStock || item.quantity_in_stock || 1, 10) || 1);
      const costPrice = toNumber(item.costPrice || item.cost_price);
      const sellingPrice = toNumber(item.sellingPrice || item.selling_price);
      const imei = String(item.imeiNumber || item.imei_number || "").trim();

      if (!productName || !brand || costPrice <= 0) {
        throw new Error("Each product requires product name, brand, and cost price");
      }

      if (productType === "Phone" && !imei) {
        throw new Error(`IMEI number is required for phone product ${productName}`);
      }

      return {
        product_name: productName,
        product_type: productType,
        brand,
        model: String(item.model || "").trim() || null,
        storage_capacity: String(item.storageCapacity || item.storage_capacity || "").trim() || null,
        color: String(item.color || "").trim() || null,
        condition: String(item.condition || "").trim() || null,
        sku: String(item.sku || "").trim() || `SKU-PRODU-${Math.floor(1000 + Math.random() * 9000)}`,
        imei_number: imei || null,
        barcode: String(item.barcode || "").trim() || null,
        serial_number: String(item.serialNumber || item.serial_number || "").trim() || null,
        cost_price: Number(costPrice.toFixed(2)),
        selling_price: Number(sellingPrice.toFixed(2)),
        quantity_in_stock: quantity,
        supplier_name: String(item.supplier || supplierRow.name).trim() || supplierRow.name,
        line_total: Number((costPrice * quantity).toFixed(2)),
      };
    });

    const totalAmount = Number(
      normalizedProducts.reduce((sum, item) => sum + toNumber(item.line_total), 0).toFixed(2)
    );

    let amountPaid = 0;
    if (paymentType === "full") {
      amountPaid = totalAmount;
    } else if (paymentType === "partial") {
      amountPaid = rawAmountPaid;
    } else {
      amountPaid = 0;
    }

    if (amountPaid < 0 || amountPaid > totalAmount) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Invalid amount paid",
      });
    }

    const balanceDue = Number((totalAmount - amountPaid).toFixed(2));
    const purchaseStatus = balanceDue <= 0 ? "paid" : paymentType === "partial" ? "partial" : "pending";

    const purchaseDate = new Date();
    const purchaseId = await generateId("SUPPUR", t);

    const purchaseRow = await supplierPurchase.create(
      {
        supplier_purchase_id: purchaseId,
        supplier_id: supplierId,
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        payment_type: ["full", "partial", "credit"].includes(paymentType) ? paymentType : "credit",
        payment_method: paymentMethod,
        status: purchaseStatus,
        purchase_date: purchaseDate,
        note: note || null,
        account_id: accountId || null,
      },
      { transaction: t }
    );

    const inventorySync = [];

    for (const product of normalizedProducts) {
      await supplierPurchaseItem.create(
        {
          supplier_purchase_item_id: await generateId("SUPITM", t),
          supplier_purchase_id: purchaseId,
          ...product,
        },
        { transaction: t }
      );

      const inventoryResult = await syncPurchasedProductToInventory(product, t);
      inventorySync.push(inventoryResult);
    }

    let chequeRow = null;
    if (paymentMethod === "cheque" && amountPaid > 0) {
      const chequeNumber = String(req.body.cheque_number || "").trim();
      const bankName = String(req.body.bank_name || "").trim();
      const chequeDate = req.body.cheque_date ? new Date(req.body.cheque_date) : null;

      if (!chequeNumber || !chequeDate || Number.isNaN(chequeDate.getTime())) {
        throw new Error("Cheque number and cheque date are required for cheque purchases");
      }

      chequeRow = await supplierCheque.create(
        {
          supplier_cheque_id: await generateId("SUPCHQ", t),
          supplier_id: supplierId,
          source_type: "purchase",
          source_id: purchaseId,
          cheque_number: chequeNumber,
          bank_name: bankName || null,
          cheque_date: chequeDate,
          due_date: chequeDate,
          amount: amountPaid,
          status: "pending",
          note: note || null,
        },
        { transaction: t }
      );

      await purchaseRow.update({ cheque_id: chequeRow.supplier_cheque_id }, { transaction: t });
    }

    let transactionRow = null;
    if (amountPaid > 0) {
      const accountRow = await resolveSupplierAccount(accountId, paymentMethod, t);
      transactionRow = await createSupplierDebitTransaction({
        accountRow,
        amount: amountPaid,
        description: `Supplier purchase ${purchaseId} paid to ${supplierRow.name}`,
        transaction: t,
      });

      if (transactionRow) {
        await purchaseRow.update(
          {
            transaction_id: transactionRow.transaction_id,
            account_id: accountRow.acc_id,
          },
          { transaction: t }
        );
      }
    }

    await supplierRow.update(
      {
        outstanding_balance: Number((toNumber(supplierRow.outstanding_balance) + balanceDue).toFixed(2)),
        last_purchase_date: purchaseDate,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Supplier purchase created successfully",
      data: purchaseRow,
      cheque: chequeRow
        ? {
            supplier_cheque_id: chequeRow.supplier_cheque_id,
            status: chequeRow.status,
            due_date: chequeRow.due_date,
            flag: getChequeFlagFromDueDate(chequeRow.due_date, chequeRow.status),
          }
        : null,
      transaction: transactionRow
        ? {
            transaction_id: transactionRow.transaction_id,
            amount: toNumber(transactionRow.amount),
            account_id: transactionRow.account_id,
          }
        : null,
      inventory: {
        synced_items: inventorySync.length,
        items: inventorySync,
      },
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.createSupplierPayment = async (req, res) => {
  const t = await supplierPayment.sequelize.transaction();
  try {
    const supplierId = String(req.body.supplier_id || "").trim();
    const amount = toNumber(req.body.amount);
    const paymentMethod = normalizePaymentMethod(req.body.payment_method);
    const accountId = String(req.body.account_id || "").trim();
    const note = String(req.body.note || "").trim();

    if (!supplierId || amount <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "supplier_id and valid amount are required",
      });
    }

    const supplierRow = await supplier.findByPk(supplierId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!supplierRow) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Supplier not found" });
    }

    const outstanding = toNumber(supplierRow.outstanding_balance);
    if (amount > outstanding) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Payment amount cannot exceed supplier outstanding balance",
      });
    }

    const paymentId = await generateId("SUPPAY", t);
    const paymentDate = new Date();

    const paymentRow = await supplierPayment.create(
      {
        supplier_payment_id: paymentId,
        supplier_id: supplierId,
        amount: Number(amount.toFixed(2)),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        status: paymentMethod === "cheque" ? "pending_cheque" : "completed",
        note: note || null,
        account_id: accountId || null,
      },
      { transaction: t }
    );

    let chequeRow = null;
    if (paymentMethod === "cheque") {
      const chequeNumber = String(req.body.cheque_number || "").trim();
      const bankName = String(req.body.bank_name || "").trim();
      const chequeDate = req.body.cheque_date ? new Date(req.body.cheque_date) : null;

      if (!chequeNumber || !chequeDate || Number.isNaN(chequeDate.getTime())) {
        throw new Error("Cheque number and cheque date are required for cheque payments");
      }

      chequeRow = await supplierCheque.create(
        {
          supplier_cheque_id: await generateId("SUPCHQ", t),
          supplier_id: supplierId,
          source_type: "payment",
          source_id: paymentId,
          cheque_number: chequeNumber,
          bank_name: bankName || null,
          cheque_date: chequeDate,
          due_date: chequeDate,
          amount: Number(amount.toFixed(2)),
          status: "pending",
          note: note || null,
        },
        { transaction: t }
      );

      await paymentRow.update({ cheque_id: chequeRow.supplier_cheque_id }, { transaction: t });
    }

    const accountRow = await resolveSupplierAccount(accountId, paymentMethod, t);
    const transactionRow = await createSupplierDebitTransaction({
      accountRow,
      amount,
      description: `Supplier payment ${paymentId} paid to ${supplierRow.name}`,
      transaction: t,
    });

    if (transactionRow) {
      await paymentRow.update(
        {
          transaction_id: transactionRow.transaction_id,
          account_id: accountRow.acc_id,
        },
        { transaction: t }
      );
    }

    await applyPaymentAgainstPurchases(supplierId, amount, t);

    await supplierRow.update(
      {
        outstanding_balance: Number(Math.max(outstanding - amount, 0).toFixed(2)),
        last_payment_date: paymentDate,
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Supplier payment recorded successfully",
      data: paymentRow,
      cheque: chequeRow
        ? {
            supplier_cheque_id: chequeRow.supplier_cheque_id,
            status: chequeRow.status,
            due_date: chequeRow.due_date,
            flag: getChequeFlagFromDueDate(chequeRow.due_date, chequeRow.status),
          }
        : null,
      transaction: transactionRow
        ? {
            transaction_id: transactionRow.transaction_id,
            amount: toNumber(transactionRow.amount),
            account_id: transactionRow.account_id,
          }
        : null,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSupplierCheques = async (req, res) => {
  const t = await supplierCheque.sequelize.transaction();
  try {
    const whereClause = {};

    if (req.query.supplier_id) {
      whereClause.supplier_id = String(req.query.supplier_id).trim();
    }

    const rows = await supplierCheque.findAll({
      where: whereClause,
      order: [["due_date", "ASC"], ["createdAt", "DESC"]],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    await syncChequeStatus(rows, t);

    const status = req.query.status ? String(req.query.status).toLowerCase() : "";
    const flagFilter = req.query.flag ? String(req.query.flag).toLowerCase() : "";

    let data = rows.map((row) => ({
      ...row.toJSON(),
      flag: row.getDataValue("flag") || getChequeFlagFromDueDate(row.due_date, row.status),
    }));

    if (status) {
      data = data.filter((row) => String(row.status).toLowerCase() === status);
    }

    if (flagFilter) {
      data = data.filter((row) => String(row.flag).toLowerCase() === flagFilter);
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.updateSupplierChequeStatus = async (req, res) => {
  const t = await supplierCheque.sequelize.transaction();
  try {
    const { cheque_id } = req.params;
    const nextStatus = String(req.body.status || "").toLowerCase();

    if (!["pending", "cleared", "bounced", "overdue"].includes(nextStatus)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Invalid cheque status",
      });
    }

    const row = await supplierCheque.findByPk(cheque_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Cheque not found" });
    }

    await row.update({ status: nextStatus }, { transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: "Cheque status updated successfully",
      data: {
        ...row.toJSON(),
        flag: getChequeFlagFromDueDate(row.due_date, row.status),
      },
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.getSupplierById = async (req, res) => {
  const t = await supplier.sequelize.transaction();
  try {
    const { id } = req.params;

    const row = await supplier.findByPk(id, { transaction: t });
    if (!row) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Supplier not found" });
    }

    const [purchases, payments, cheques] = await Promise.all([
      supplierPurchase.findAll({
        where: { supplier_id: id },
        order: [["purchase_date", "DESC"], ["createdAt", "DESC"]],
        include: [{
          model: supplierPurchaseItem,
          as: "items",
        }],
        transaction: t,
      }),
      supplierPayment.findAll({
        where: { supplier_id: id },
        order: [["payment_date", "DESC"], ["createdAt", "DESC"]],
        transaction: t,
      }),
      supplierCheque.findAll({
        where: { supplier_id: id },
        order: [["due_date", "ASC"]],
        transaction: t,
        lock: t.LOCK.UPDATE,
      }),
    ]);

    await syncChequeStatus(cheques, t);

    await t.commit();

    return res.status(200).json({
      success: true,
      data: {
        supplier: row,
        purchases,
        payments,
        cheques: cheques.map((cheque) => ({
          ...cheque.toJSON(),
          flag: cheque.getDataValue("flag") || getChequeFlagFromDueDate(cheque.due_date, cheque.status),
        })),
      },
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
