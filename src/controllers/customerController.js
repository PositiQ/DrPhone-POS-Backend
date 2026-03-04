const { customer, customer_sales } = require("../models");
const generateId = require("../helpers/idGen");
const { Op } = require("sequelize");

// Create a new customer
exports.createCustomer = async (req, res) => {
  const t = await customer.sequelize.transaction();
  try {
    const {
      name,
      email,
      phone_number,
      atlernative_phone_number,
      nic_or_passport_number,
      dob,
      gender,
      type,
      address,
      city,
      district,
      postal_code,
      country,
      credit_limit,
      credit_days,
      discount_rate,
      prefferred_payment_method,
      registration_date,
      status,
      reffered_by,
      note,
    } = req.body;

    // Validate required fields
    if (!name || !phone_number || !type) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Name, phone number, and type are required fields",
      });
    }

    // Generate customer ID
    const customerID = await generateId("CUST", t);

    console.log("Generated Customer ID:", customerID);

    // Create new customer
    const newCustomer = await customer.create({
      customer_id: customerID,
      name,
      email,
      phone_number,
      atlernative_phone_number,
      nic_or_passport_number,
      dob,
      gender,
      type,
      address,
      city,
      district,
      postal_code,
      country,
      credit_limit,
      credit_days,
      discount_rate,
      prefferred_payment_method,
      registration_date,
      status: status || "active",
      reffered_by,
      note,
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: newCustomer,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error creating customer",
      error: error.message,
    });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  const t = await customer.sequelize.transaction();
  try {
    const customerData = await customer.findByPk(req.params.id, {
      include: [
        {
          model: customer_sales,
          as: "customer_sales",
        },
      ],
      transaction: t,
    });

    if (!customerData) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await t.commit();

    res.status(200).json({
      success: true,
      data: customerData,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error fetching customer",
      error: error.message,
    });
  }
};

// Get all customers
exports.getAllCustomers = async (req, res) => {
  const t = await customer.sequelize.transaction();
  try {
    const limit = parseInt(req.query.limit) || 100;
    const type = req.query.type; // Filter by customer type (regular/wholesale)
    const status = req.query.status; // Filter by status (active/inactive)

    const whereClause = {};
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    const customers = await customer.findAll({
      where: whereClause,
      include: [
        {
          model: customer_sales,
          as: "customer_sales",
        },
      ],
      limit: limit,
      order: [["createdAt", "DESC"]],
      transaction: t,
    });

    // Calculate statistics
    const stats = {
      total: customers.length,
      active: customers.filter((c) => c.status === "active").length,
      inactive: customers.filter((c) => c.status === "inactive").length,
      regular: customers.filter((c) => c.type === "regular").length,
      wholesale: customers.filter((c) => c.type === "wholesale").length,
    };

    await t.commit();

    res.status(200).json({
      success: true,
      data: customers,
      stats,
      isAll: customers.length < limit,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

// Search customers
exports.searchCustomers = async (req, res) => {
  const t = await customer.sequelize.transaction();
  try {
    const { query } = req.query;

    if (!query) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const customers = await customer.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { phone_number: { [Op.like]: `%${query}%` } },
          { atlernative_phone_number: { [Op.like]: `%${query}%` } },
          { nic_or_passport_number: { [Op.like]: `%${query}%` } },
          { customer_id: { [Op.like]: `%${query}%` } },
        ],
      },
      include: [
        {
          model: customer_sales,
          as: "customer_sales",
        },
      ],
      transaction: t,
    });

    await t.commit();

    res.status(200).json({
      success: true,
      data: customers,
      count: customers.length,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error searching customers",
      error: error.message,
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  const t = await customer.sequelize.transaction();
  try {
    const customerData = await customer.findByPk(req.params.id, {
      transaction: t,
    });

    if (!customerData) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Prevent updating customer_id
    const { customer_id, ...updateData } = req.body;

    await customerData.update(updateData, { transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customerData,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error updating customer",
      error: error.message,
    });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  const t = await customer.sequelize.transaction();
  try {
    const customerData = await customer.findByPk(req.params.id, {
      transaction: t,
    });

    if (!customerData) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await customerData.destroy({ transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error deleting customer",
      error: error.message,
    });
  }
};

// Get customer sales history
exports.getCustomerSales = async (req, res) => {
  const t = await customer_sales.sequelize.transaction();
  try {
    const sales = await customer_sales.findAll({
      where: { customer_id: req.params.id },
      order: [["last_sales_date", "DESC"]],
      transaction: t,
    });

    if (!sales || sales.length === 0) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "No sales found for this customer",
      });
    }

    // Calculate total sales and dues
    const totalSales = sales.reduce(
      (sum, sale) => sum + parseFloat(sale.total_sales_amount || 0),
      0,
    );
    const totalPaid = sales.reduce(
      (sum, sale) => sum + parseFloat(sale.paid_amount || 0),
      0,
    );
    const totalDue = totalSales - totalPaid;

    await t.commit();

    res.status(200).json({
      success: true,
      data: sales,
      summary: {
        totalSales: totalSales.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalDue: totalDue.toFixed(2),
        salesCount: sales.length,
      },
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error fetching customer sales",
      error: error.message,
    });
  }
};

// Create customer sale record
exports.createCustomerSale = async (req, res) => {
  const t = await customer_sales.sequelize.transaction();
  try {
    const {
      customer_id,
      total_sales_amount,
      last_sales_date,
      is_due_available,
      paid_amount,
      payment_status,
    } = req.body;

    // Validate required fields
    if (!customer_id || !total_sales_amount || !last_sales_date || !payment_status) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Customer ID, total sales amount, last sales date, and payment status are required",
      });
    }

    // Check if customer exists
    const customerData = await customer.findByPk(customer_id, {
      transaction: t,
    });
    if (!customerData) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Create sale record
    const newSale = await customer_sales.create({
      customer_id,
      total_sales_amount,
      last_sales_date,
      is_due_available: is_due_available || false,
      paid_amount,
      payment_status,
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      success: true,
      message: "Customer sale record created successfully",
      data: newSale,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error creating customer sale",
      error: error.message,
    });
  }
};

// Update customer sale
exports.updateCustomerSale = async (req, res) => {
  const t = await customer_sales.sequelize.transaction();
  try {
    const sale = await customer_sales.findByPk(req.params.id, {
      transaction: t,
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Sale record not found",
      });
    }

    await sale.update(req.body, { transaction: t });

    await t.commit();

    res.status(200).json({
      success: true,
      message: "Customer sale updated successfully",
      data: sale,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error updating customer sale",
      error: error.message,
    });
  }
};

// Get customers with outstanding dues
exports.getCustomersWithDues = async (req, res) => {
  const t = await customer_sales.sequelize.transaction();
  try {
    const customersWithDues = await customer_sales.findAll({
      where: {
        is_due_available: true,
        payment_status: {
          [Op.in]: ["pending", "overdue"],
        },
      },
      include: [
        {
          model: customer,
          as: "customer",
        },
      ],
      order: [["last_sales_date", "DESC"]],
      transaction: t,
    });

    await t.commit();

    res.status(200).json({
      success: true,
      data: customersWithDues,
      count: customersWithDues.length,
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({
      success: false,
      message: "Error fetching customers with dues",
      error: error.message,
    });
  }
};
