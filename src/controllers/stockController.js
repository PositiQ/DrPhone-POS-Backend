const {
  Product_Stock,
  Stock_Issues,
  shop,
  Product,
  shopSales,
  sequelize,
} = require("../models");

// Issue a stock item
exports.issueStock = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { product_id, issued_shop_id, issued_stock, selling_price, payment_status } = req.body;

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
      storage_location: shopName
    }, { transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      message: "Stock issued successfully",
      data: issueStock
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

    const { count, rows } = await Stock_Issues.findAndCountAll({
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

exports.completeStockIssueSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const issueId = req.params.id;

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

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Sale marked as completed',
      data: issue,
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
