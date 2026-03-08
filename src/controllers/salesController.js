const { sales, itemSales, Product, customer, Product_Stock } = require("../models");
const generateId = require("../helpers/idGen");
const { Op, ValidationError, UniqueConstraintError } = require("sequelize");

function buildSalesDateFilter(startDate, endDate) {
  const salesDateFilter = {};

  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    salesDateFilter[Op.gte] = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    salesDateFilter[Op.lte] = end;
  }

  return salesDateFilter;
}

// Create a new sale
exports.createSale = async (req, res) => {
  try {
    const result = await sales.sequelize.transaction(async (transaction) => {
      const {
        customer_id,
        items, // Array of {product_id, quantity, unit_price, discount}
        total_discount,
        payment_method,
        status,
      } = req.body;

      // Validate required fields
      if (!items || items.length === 0) {
        throw new Error("At least one item is required for a sale");
      }
      if (!payment_method) {
        throw new Error("Payment method is required");
      }

      // Validate customer before creating dependent records to avoid FK errors.
      if (customer_id) {
        const customerRecord = await customer.findByPk(customer_id, { transaction });
        if (!customerRecord) {
          throw new Error(`Customer with ID ${customer_id} not found`);
        }
      }

      // Generate sale ID
      const salesId = await generateId("SALE", transaction);
      const saleDate = new Date();

      // Calculate total amount and validate stock
      let totalAmount = 0;
      const itemsToCreate = [];

      for (const item of items) {
        const { product_id, quantity, unit_price, discount = 0 } = item;

        // Validate item fields
        if (!product_id || !quantity || !unit_price) {
          throw new Error("Each item must have product_id, quantity, and unit_price");
        }

        // Check if product exists
        const product = await Product.findByPk(product_id, { transaction });
        if (!product) {
          throw new Error(`Product with ID ${product_id} not found`);
        }

        // Check stock availability
        const productStock = await Product_Stock.findOne({
          where: { product_id },
          transaction,
        });

        if (!productStock) {
          throw new Error(`Stock information not found for product ${product_id}`);
        }

        if (productStock.quantity_in_stock < quantity) {
          throw new Error(
            `Insufficient stock for product ${product.productName}. Available: ${productStock.quantity_in_stock}, Required: ${quantity}`
          );
        }

        // Calculate item total
        const itemTotal = (unit_price * quantity) - discount;
        totalAmount += itemTotal;

        // Generate item sale ID
        const itemSaleId = await generateId("ITEM", transaction);

        // Prepare item for creation
        itemsToCreate.push({
          id: itemSaleId,
          sales_id: salesId,
          product_id,
          unit_price,
          quantity,
          discount,
          total_price: itemTotal,
          sale_date: saleDate,
        });

        // Update product stock
        await productStock.decrement("quantity_in_stock", {
          by: quantity,
          transaction,
        });
      }

      // Apply total discount if provided
      if (total_discount) {
        totalAmount -= total_discount;
      }

      // Create the sale
      const newSale = await sales.create(
        {
          sales_id: salesId,
          customer_id: customer_id || null,
          total_discount: total_discount || 0,
          total_amount: totalAmount,
          sales_date: saleDate,
          payment_method,
          status: status || "completed",
        },
        { transaction }
      );

      // Create all item sales
      await itemSales.bulkCreate(itemsToCreate, { transaction });

      // This would typically update customer_sales table
      // Implementation depends on business logic for customer_sales tracking

      return salesId;
    });

    // Fetch the created sale with all details
    const createdSale = await sales.findByPk(result, {
      include: [
        {
          model: itemSales,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "productName", "brand", "model"],
            },
          ],
        },
        {
          model: customer,
          as: "customer",
          attributes: ["customer_id", "name", "phone_number", "email"],
        },
      ],
    });

    res.status(201).json({
      message: "Sale created successfully",
      sale: createdSale,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(400).json({
        error:
          "Invalid reference data. Make sure customer_id and product_id values exist.",
      });
    }
    if (error.message) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create sale" });
    }
  }
};

// Get all sales
exports.getAllSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, payment_method, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    if (status) whereClause.status = status;
    if (payment_method) whereClause.payment_method = payment_method;
    if (start_date || end_date) {
      whereClause.sales_date = buildSalesDateFilter(start_date, end_date);
    }

    const { count, rows } = await sales.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: itemSales,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "productName", "brand", "model", "price"],
            },
          ],
        },
        {
          model: customer,
          as: "customer",
          attributes: ["customer_id", "name", "phone_number", "email"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["sales_date", "DESC"]],
    });

    res.status(200).json({
      message: "Sales retrieved successfully",
      totalSales: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      sales: rows,
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ error: "Failed to retrieve sales" });
  }
};

// Get sale by ID
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await sales.findByPk(id, {
      include: [
        {
          model: itemSales,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "productName", "brand", "model", "price", "description"],
            },
          ],
        },
        {
          model: customer,
          as: "customer",
          attributes: ["customer_id", "name", "phone_number", "email", "address"],
        },
      ],
    });

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    res.status(200).json({
      message: "Sale retrieved successfully",
      sale,
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ error: "Failed to retrieve sale" });
  }
};

// Get sales by customer ID
exports.getSalesByCustomer = async (req, res) => {
  try {
    const { customer_id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await sales.findAndCountAll({
      where: { customer_id },
      include: [
        {
          model: itemSales,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "productName", "brand", "model", "price"],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["sales_date", "DESC"]],
    });

    if (count === 0) {
      return res.status(404).json({ error: "No sales found for this customer" });
    }

    res.status(200).json({
      message: "Customer sales retrieved successfully",
      totalSales: count,
      currentPage: parseInt(page),
      totalPages: Math.ceil(count / limit),
      sales: rows,
    });
  } catch (error) {
    console.error("Error fetching customer sales:", error);
    res.status(500).json({ error: "Failed to retrieve customer sales" });
  }
};

// Get sales summary (statistics)
exports.getSalesSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const whereClause = {};
    if (start_date || end_date) {
      whereClause.sales_date = buildSalesDateFilter(start_date, end_date);
    }

    const totalSales = await sales.count({ where: whereClause });
    
    const salesData = await sales.findAll({
      where: whereClause,
      attributes: [
        [sales.sequelize.fn("SUM", sales.sequelize.col("total_amount")), "totalRevenue"],
        [sales.sequelize.fn("AVG", sales.sequelize.col("total_amount")), "averageSaleAmount"],
        [sales.sequelize.fn("SUM", sales.sequelize.col("total_discount")), "totalDiscounts"],
      ],
      raw: true,
    });

    const statusBreakdown = await sales.findAll({
      where: whereClause,
      attributes: [
        "status",
        [sales.sequelize.fn("COUNT", sales.sequelize.col("status")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const paymentMethodBreakdown = await sales.findAll({
      where: whereClause,
      attributes: [
        "payment_method",
        [sales.sequelize.fn("COUNT", sales.sequelize.col("payment_method")), "count"],
      ],
      group: ["payment_method"],
      raw: true,
    });

    res.status(200).json({
      message: "Sales summary retrieved successfully",
      summary: {
        totalSales,
        totalRevenue: parseFloat(salesData[0]?.totalRevenue || 0),
        averageSaleAmount: parseFloat(salesData[0]?.averageSaleAmount || 0),
        totalDiscounts: parseFloat(salesData[0]?.totalDiscounts || 0),
        statusBreakdown,
        paymentMethodBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching sales summary:", error);
    res.status(500).json({ error: "Failed to retrieve sales summary" });
  }
};

// Update sale status
exports.updateSaleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const sale = await sales.findByPk(id);
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    await sale.update({ status });

    res.status(200).json({
      message: "Sale status updated successfully",
      sale,
    });
  } catch (error) {
    console.error("Error updating sale status:", error);
    res.status(500).json({ error: "Failed to update sale status" });
  }
};

// Delete sale (with stock restoration)
exports.deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sales.sequelize.transaction(async (transaction) => {
      const sale = await sales.findByPk(id, {
        include: [{ model: itemSales, as: "items" }],
        transaction,
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      // Restore stock for each item
      for (const item of sale.items) {
        const productStock = await Product_Stock.findOne({
          where: { product_id: item.product_id },
          transaction,
        });

        if (productStock) {
          await productStock.increment("quantity_in_stock", {
            by: item.quantity,
            transaction,
          });
        }
      }

      // Delete the sale (this will cascade delete items)
      await sale.destroy({ transaction });

      return true;
    });

    res.status(200).json({
      message: "Sale deleted successfully and stock restored",
    });
  } catch (error) {
    console.error("Error deleting sale:", error);
    if (error.message === "Sale not found") {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to delete sale" });
    }
  }
};
