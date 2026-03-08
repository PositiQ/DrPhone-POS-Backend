const dotenv = require('dotenv');
const app = require('./app');
const { sequelize } = require('./src/models');

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const ensureStockQuantityColumn = async () => {
  // First check if the table exists
  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Product_Stock'"
  );
  
  if (tables.length === 0) {
    console.log("Product_Stock table doesn't exist yet, will be created by sync.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('Product_Stock')");
  const hasQuantityInStock = tableInfo.some(
    (column) => column.name === 'quantity_in_stock'
  );

  if (!hasQuantityInStock) {
    await sequelize.query(
      "ALTER TABLE Product_Stock ADD COLUMN quantity_in_stock INTEGER NOT NULL DEFAULT 0"
    );
    console.log("Added missing Product_Stock.quantity_in_stock column.");
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
