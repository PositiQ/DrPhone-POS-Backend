const { Product, Product_Stock } = require("../models");
const generateId = require("../helpers/idGen");

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

    res
      .status(201)
      .json({
        success: true,
        message: "Product created successfully",
        ...result,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error creating product",
        error: error.message,
      });
  }
};
