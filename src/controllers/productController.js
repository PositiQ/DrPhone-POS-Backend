const { Product, Product_Stock } = require("../models");
const generateId = require("../helpers/idGen");
const { Op } = require("sequelize");

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const result = await Product.sequelize.transaction(async (transaction) => {
      const {
        productName,
        description,
        price,
        brand,
        model,
        color,
        capacity,
        condition,
        warrenty,
        IMEI,
        barcode,
        serialNumber,
        sku,
        cost_price,
        selling_price,
        profit_margin,
        supplier,
        minimum_stock_level,
        storage_location,
        date_added,
        status,
      } = req.body;

      const productID = await generateId("PROD");

      console.log("Generated Product ID:", productID);

      const newProduct = await Product.create(
        {
          id: productID,
          productName,
          description,
          price,
          brand,
          model,
          color,
          capacity,
          condition,
          warrenty,
          IMEI,
          barcode,
          serialNumber,
        },
        { transaction },
      );

      const productStock = await Product_Stock.create(
        {
          product_id: newProduct.id, // ✅ safest
          sku,
          cost_price,
          selling_price,
          profit_margin,
          supplier,
          minimum_stock_level,
          storage_location,
          date_added,
          status,
        },
        { transaction },
      );

      return { newProduct, productStock };
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

// Get Product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: Product_Stock,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching product",
        error: error.message,
      });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100; // Default to 100 if no limit provided
    const products = await Product.findAll({
      include: Product_Stock,
      limit: limit,
    });
    res
      .status(200)
      .json({ success: true, data: products, isAll: products.length < limit });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching products",
        error: error.message,
      });
  }
};

// Search products by name or IMEI or barcode or serial number
exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { productName: { [Op.like]: `%${query}%` } },
          { IMEI: { [Op.like]: `%${query}%` } },
          { barcode: { [Op.like]: `%${query}%` } },
          { serialNumber: { [Op.like]: `%${query}%` } },
        ],
      },
      include: Product_Stock,
    });

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error searching products",
        error: error.message,
      });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await product.update(req.body);

    res
      .status(200)
      .json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating product",
        error: error.message,
      });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await product.destroy();
    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting product",
        error: error.message,
      });
  }
};
