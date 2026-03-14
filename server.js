const dotenv = require('dotenv');
const app = require('./app');
const { sequelize } = require('./src/models');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const isSqlite = () => {
  if ((process.env.DB_TYPE || '').toLowerCase() === 'sqlite') {
    return true;
  }

  if (typeof sequelize.getDialect === 'function') {
    return sequelize.getDialect() === 'sqlite';
  }

  return false;
};

const ensureStockQuantityColumn = async () => {

  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Product_Stock'"
  );

  if (tables.length === 0) {
    console.log("Product_Stock table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('Product_Stock')");

  const hasQuantityInStock = tableInfo.some(
    (column) => column.name === "quantity_in_stock"
  );

  if (!hasQuantityInStock) {
    await sequelize.query(
      "ALTER TABLE Product_Stock ADD COLUMN quantity_in_stock INTEGER NOT NULL DEFAULT 0"
    );

    console.log("Added missing Product_Stock.quantity_in_stock column.");
  }
};

const ensureStockIssuesColumns = async () => {

  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Stock_Issues'"
  );

  if (tables.length === 0) {
    console.log("Stock_Issues table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('Stock_Issues')");
  const existingColumns = new Set(tableInfo.map((column) => column.name));

  const requiredColumns = [
    {
      name: 'selling_price',
      sql: "ALTER TABLE Stock_Issues ADD COLUMN selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0",
      log: 'Added missing Stock_Issues.selling_price column.',
    },
    {
      name: 'issued_shop_id',
      sql: "ALTER TABLE Stock_Issues ADD COLUMN issued_shop_id VARCHAR(255)",
      log: 'Added missing Stock_Issues.issued_shop_id column.',
    },
    {
      name: 'issued_stock',
      sql: "ALTER TABLE Stock_Issues ADD COLUMN issued_stock INTEGER NOT NULL DEFAULT 1",
      log: 'Added missing Stock_Issues.issued_stock column.',
    },
    {
      name: 'issued_date',
      sql: "ALTER TABLE Stock_Issues ADD COLUMN issued_date DATETIME",
      log: 'Added missing Stock_Issues.issued_date column.',
    },
    {
      name: 'status',
      sql: "ALTER TABLE Stock_Issues ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending_payment'",
      log: 'Added missing Stock_Issues.status column.',
    },
    {
      name: 'linked_sales_id',
      sql: "ALTER TABLE Stock_Issues ADD COLUMN linked_sales_id VARCHAR(255)",
      log: 'Added missing Stock_Issues.linked_sales_id column.',
    },
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(column.sql);
      console.log(column.log);
    }
  }
};
// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Sync models with database first
    await sequelize.sync({ alter: false });
    console.log('Database synchronized.');

    // Then ensure schema compatibility for legacy SQLite databases
    await ensureStockQuantityColumn();
    await ensureStockIssuesColumns();

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();
