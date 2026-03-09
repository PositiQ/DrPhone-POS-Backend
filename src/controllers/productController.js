const { Product, Product_Stock } = require("../models");
const generateId = require("../helpers/idGen");
const { Op, ValidationError, UniqueConstraintError } = require("sequelize");

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
        quantity_in_stock,
        storage_location,
        date_added,
        status,
        product_type,
      } = req.body;

      const productID = await generateId("PROD");

      // Check required fields
      if (!productName || !price || !brand) {
        throw new Error(
          "Missing required fields: productName, price, and brand are required.",
        );
      }

      // Phone-specific validation: IMEI is required for phones
      if (product_type === 'phone' && !IMEI) {
        throw new Error(
          "IMEI is required for phone products.",
        );
      }

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
          IMEI: product_type === 'phone' ? IMEI : null,
          barcode,
          serialNumber,
          product_type: product_type || 'phone',
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
          quantity_in_stock: quantity_in_stock || 1, // default to 1 if not provided
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
    console.error(error); // always log full error

    let errorMessage = error.message;

    // Sequelize validation errors
    if (error instanceof ValidationError) {
      errorMessage = error.errors.map((e) => e.message).join(", ");
    }

    // Unique constraint errors (duplicate values)
    if (error instanceof UniqueConstraintError) {
      errorMessage = error.errors.map((e) => e.message).join(", ");
    }

    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: errorMessage,
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
    res.status(500).json({
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
    res.status(200).json({
      success: true,
      data: products,
      isAll: products.length < limit,
      inStock: products.filter(
        (p) => p.Product_Stock && p.Product_Stock.status === "in_stock",
      ).length,
      soldOut: products.filter(
        (p) => p.Product_Stock && p.Product_Stock.status === "out_of_stock",
      ).length,
    });
  } catch (error) {
    res.status(500).json({
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
    res.status(500).json({
      success: false,
      message: "Error searching products",
      error: error.message,
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const result = await Product.sequelize.transaction(async (transaction) => {
      const product = await Product.findByPk(req.params.id, {
        include: Product_Stock,
      });

      if (!product) {
        throw new Error("Product not found");
      }

      // Separate product fields from product_stock fields
      const productFields = {};
      const stockFields = {};
      const stockFieldKeys = [
        'sku',
        'cost_price',
        'selling_price',
        'profit_margin',
        'supplier',
        'minimum_stock_level',
        'quantity_in_stock',
        'storage_location',
        'date_added',
        'status'
      ];

      Object.keys(req.body).forEach(key => {
        if (stockFieldKeys.includes(key)) {
          stockFields[key] = req.body[key];
        } else {
          productFields[key] = req.body[key];
        }
      });

      // Update product fields
      if (Object.keys(productFields).length > 0) {
        await product.update(productFields, { transaction });
      }

      // Update product_stock fields
      if (Object.keys(stockFields).length > 0 && product.Product_Stock) {
        await product.Product_Stock.update(stockFields, { transaction });
      }

      // Reload to get updated data
      await product.reload({ include: Product_Stock });

      return product;
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
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
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};
