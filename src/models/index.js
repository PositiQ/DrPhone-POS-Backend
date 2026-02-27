const sequelize = require('../config/db.config');

// Import models
const Product = require('./Product');
const Product_Stock = require('./productStock');
const Stock_Issues = require('./stockIssues');
const id_gen = require('./id');

// Define associations
Product.hasOne(Product_Stock, { foreignKey: 'product_id', onDelete: 'CASCADE' });
Product_Stock.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = {
  sequelize,
    Product,
    Product_Stock,
    Stock_Issues,
    id_gen
};
