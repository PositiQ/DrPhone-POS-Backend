const sequelize = require('../config/db.config');

// Import models
const Product = require('./Product');
const Product_Stock = require('./productStock');
const Stock_Issues = require('./stockIssues');
const id_gen = require('./id');
const customer = require('./customer');
const customer_sales = require('./customerSales');
const sales = require('./sale');
const itemSales = require('./ItemSales');

// Define associations
Product.hasOne(Product_Stock, { foreignKey: 'product_id', onDelete: 'CASCADE' });
Product_Stock.belongsTo(Product, { foreignKey: 'product_id' });

// Customer associations
customer.hasMany(customer_sales, { foreignKey: 'customer_id', as: 'customer_sales', onDelete: 'CASCADE' });
customer_sales.belongsTo(customer, { foreignKey: 'customer_id', as: 'customer' });

// Sales associations
sales.belongsTo(customer, { foreignKey: 'customer_id', as: 'customer' });
customer.hasMany(sales, { foreignKey: 'customer_id', as: 'sales' });

sales.hasMany(itemSales, { foreignKey: 'sales_id', as: 'items', onDelete: 'CASCADE' });
itemSales.belongsTo(sales, { foreignKey: 'sales_id', as: 'sale' });

itemSales.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(itemSales, { foreignKey: 'product_id', as: 'itemSales' });

module.exports = {
  sequelize,
    Product,
    Product_Stock,
    Stock_Issues,
    id_gen,
    customer,
    customer_sales,
    sales,
    itemSales,
};
