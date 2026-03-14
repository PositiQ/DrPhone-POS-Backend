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
const account = require('./account');
const bankAcc = require('./bankAcc');
const drawerAcc = require('./drawerAcc');
const trasactions = require('./trasactions');
const shop = require('./shop');
const shopSales = require('./shopSales');
const expense = require('./expense');
const expenseCategory = require('./expenseCategory');
const supplier = require('./supplier');
const supplierPurchase = require('./supplierPurchase');
const supplierPurchaseItem = require('./supplierPurchaseItem');
const supplierPayment = require('./supplierPayment');
const supplierCheque = require('./supplierCheque');
const returnRepairTicket = require('./returnRepairTicket');
const repairPart = require('./repairPart');

// Define associations
Product.hasOne(Product_Stock, { foreignKey: 'product_id', onDelete: 'CASCADE' });
Product_Stock.belongsTo(Product, { foreignKey: 'product_id' });

// Stock issue associations
Product_Stock.hasMany(Stock_Issues, { foreignKey: 'product_id', sourceKey: 'product_id' });
Stock_Issues.belongsTo(Product_Stock, { foreignKey: 'product_id', targetKey: 'product_id' });

// Customer associations
customer.hasMany(customer_sales, { foreignKey: 'customer_id', as: 'customer_sales', onDelete: 'CASCADE' });
customer_sales.belongsTo(customer, { foreignKey: 'customer_id', as: 'customer' });

// Sales associations
sales.belongsTo(customer, { foreignKey: 'customer_id', as: 'customer' });
customer.hasMany(sales, { foreignKey: 'customer_id', as: 'sales' });

sales.hasMany(itemSales, { foreignKey: 'sales_id', as: 'items', onDelete: 'CASCADE' });
itemSales.belongsTo(sales, { foreignKey: 'sales_id', as: 'sale' });

// Product associations
itemSales.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(itemSales, { foreignKey: 'product_id', as: 'itemSales' });

// Issue associations
shop.hasMany(Stock_Issues, { foreignKey: 'issued_shop_id', as: 'stock_issues', onDelete: 'CASCADE' });
Stock_Issues.belongsTo(shop, { foreignKey: 'issued_shop_id', as: 'shop' });

// Shop Sales associations
shop.hasOne(shopSales, { foreignKey: 'shop_id', as: 'sales', onDelete: 'CASCADE' });
shopSales.belongsTo(shop, { foreignKey: 'shop_id', as: 'shop' });

// Expense associations
expense.belongsTo(account, { foreignKey: 'account_id', as: 'account' });
account.hasMany(expense, { foreignKey: 'account_id', as: 'expenses' });

expense.belongsTo(expenseCategory, { foreignKey: 'category_id', as: 'categoryRef' });
expenseCategory.hasMany(expense, { foreignKey: 'category_id', as: 'expenses' });

// Supplier associations
supplier.hasMany(supplierPurchase, { foreignKey: 'supplier_id', as: 'purchases', onDelete: 'CASCADE' });
supplierPurchase.belongsTo(supplier, { foreignKey: 'supplier_id', as: 'supplier' });

supplierPurchase.hasMany(supplierPurchaseItem, { foreignKey: 'supplier_purchase_id', as: 'items', onDelete: 'CASCADE' });
supplierPurchaseItem.belongsTo(supplierPurchase, { foreignKey: 'supplier_purchase_id', as: 'purchase' });

supplier.hasMany(supplierPayment, { foreignKey: 'supplier_id', as: 'payments', onDelete: 'CASCADE' });
supplierPayment.belongsTo(supplier, { foreignKey: 'supplier_id', as: 'supplier' });

supplier.hasMany(supplierCheque, { foreignKey: 'supplier_id', as: 'cheques', onDelete: 'CASCADE' });
supplierCheque.belongsTo(supplier, { foreignKey: 'supplier_id', as: 'supplier' });

supplierPurchase.belongsTo(account, { foreignKey: 'account_id', as: 'account' });
account.hasMany(supplierPurchase, { foreignKey: 'account_id', as: 'supplierPurchases' });

supplierPayment.belongsTo(account, { foreignKey: 'account_id', as: 'account' });
account.hasMany(supplierPayment, { foreignKey: 'account_id', as: 'supplierPayments' });

// Return and repair associations
returnRepairTicket.hasMany(repairPart, { foreignKey: 'ticket_id', as: 'parts', onDelete: 'CASCADE' });
repairPart.belongsTo(returnRepairTicket, { foreignKey: 'ticket_id', as: 'ticket' });




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
    account,
    bankAcc,
    drawerAcc,
    trasactions,
    shop,
    shopSales,
    expense,
    expenseCategory,
    supplier,
    supplierPurchase,
    supplierPurchaseItem,
    supplierPayment,
    supplierCheque,
    returnRepairTicket,
    repairPart,
};
