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

const ensureSupplierColumns = async () => {
  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier'"
  );

  if (tables.length === 0) {
    console.log("supplier table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('supplier')");
  const existingColumns = new Set(tableInfo.map((column) => column.name));

  const requiredColumns = [
    {
      name: "supplier_id",
      sql: "ALTER TABLE supplier ADD COLUMN supplier_id VARCHAR(255)",
      log: "Added missing supplier.supplier_id column.",
    },
    {
      name: "status",
      sql: "ALTER TABLE supplier ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active'",
      log: "Added missing supplier.status column.",
    },
    {
      name: "last_purchase_date",
      sql: "ALTER TABLE supplier ADD COLUMN last_purchase_date DATETIME",
      log: "Added missing supplier.last_purchase_date column.",
    },
    {
      name: "last_payment_date",
      sql: "ALTER TABLE supplier ADD COLUMN last_payment_date DATETIME",
      log: "Added missing supplier.last_payment_date column.",
    },
    {
      name: "notes",
      sql: "ALTER TABLE supplier ADD COLUMN notes VARCHAR(255)",
      log: "Added missing supplier.notes column.",
    },
    {
      name: "outstanding_balance",
      sql: "ALTER TABLE supplier ADD COLUMN outstanding_balance DECIMAL(12, 2) NOT NULL DEFAULT 0",
      log: "Added missing supplier.outstanding_balance column.",
    },
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(column.sql);
      console.log(column.log);
    }
  }
};

const ensureSupplierPurchaseColumns = async () => {
  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_purchase'"
  );

  if (tables.length === 0) {
    console.log("supplier_purchase table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('supplier_purchase')");
  const existingColumns = new Set(tableInfo.map((column) => column.name));

  const requiredColumns = [
    {
      name: "supplier_purchase_id",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN supplier_purchase_id VARCHAR(255)",
      log: "Added missing supplier_purchase.supplier_purchase_id column.",
    },
    {
      name: "status",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending'",
      log: "Added missing supplier_purchase.status column.",
    },
    {
      name: "total_amount",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0",
      log: "Added missing supplier_purchase.total_amount column.",
    },
    {
      name: "amount_paid",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0",
      log: "Added missing supplier_purchase.amount_paid column.",
    },
    {
      name: "balance_due",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0",
      log: "Added missing supplier_purchase.balance_due column.",
    },
    {
      name: "payment_type",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN payment_type VARCHAR(255) NOT NULL DEFAULT 'credit'",
      log: "Added missing supplier_purchase.payment_type column.",
    },
    {
      name: "payment_method",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN payment_method VARCHAR(255) NOT NULL DEFAULT 'cash'",
      log: "Added missing supplier_purchase.payment_method column.",
    },
    {
      name: "purchase_date",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN purchase_date DATETIME",
      log: "Added missing supplier_purchase.purchase_date column.",
    },
    {
      name: "account_id",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN account_id VARCHAR(255)",
      log: "Added missing supplier_purchase.account_id column.",
    },
    {
      name: "transaction_id",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN transaction_id VARCHAR(255)",
      log: "Added missing supplier_purchase.transaction_id column.",
    },
    {
      name: "cheque_id",
      sql: "ALTER TABLE supplier_purchase ADD COLUMN cheque_id VARCHAR(255)",
      log: "Added missing supplier_purchase.cheque_id column.",
    },
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(column.sql);
      console.log(column.log);
    }
  }
};

const ensureSupplierPaymentColumns = async () => {
  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_payment'"
  );

  if (tables.length === 0) {
    console.log("supplier_payment table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('supplier_payment')");
  const existingColumns = new Set(tableInfo.map((column) => column.name));

  const requiredColumns = [
    {
      name: "supplier_payment_id",
      sql: "ALTER TABLE supplier_payment ADD COLUMN supplier_payment_id VARCHAR(255)",
      log: "Added missing supplier_payment.supplier_payment_id column.",
    },
    {
      name: "payment_method",
      sql: "ALTER TABLE supplier_payment ADD COLUMN payment_method VARCHAR(255) NOT NULL DEFAULT 'cash'",
      log: "Added missing supplier_payment.payment_method column.",
    },
    {
      name: "payment_date",
      sql: "ALTER TABLE supplier_payment ADD COLUMN payment_date DATETIME",
      log: "Added missing supplier_payment.payment_date column.",
    },
    {
      name: "status",
      sql: "ALTER TABLE supplier_payment ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'completed'",
      log: "Added missing supplier_payment.status column.",
    },
    {
      name: "account_id",
      sql: "ALTER TABLE supplier_payment ADD COLUMN account_id VARCHAR(255)",
      log: "Added missing supplier_payment.account_id column.",
    },
    {
      name: "transaction_id",
      sql: "ALTER TABLE supplier_payment ADD COLUMN transaction_id VARCHAR(255)",
      log: "Added missing supplier_payment.transaction_id column.",
    },
    {
      name: "cheque_id",
      sql: "ALTER TABLE supplier_payment ADD COLUMN cheque_id VARCHAR(255)",
      log: "Added missing supplier_payment.cheque_id column.",
    },
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(column.sql);
      console.log(column.log);
    }
  }
};

const ensureSupplierChequeColumns = async () => {
  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_cheque'"
  );

  if (tables.length === 0) {
    console.log("supplier_cheque table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('supplier_cheque')");
  const existingColumns = new Set(tableInfo.map((column) => column.name));

  const requiredColumns = [
    {
      name: "supplier_cheque_id",
      sql: "ALTER TABLE supplier_cheque ADD COLUMN supplier_cheque_id VARCHAR(255)",
      log: "Added missing supplier_cheque.supplier_cheque_id column.",
    },
    {
      name: "source_type",
      sql: "ALTER TABLE supplier_cheque ADD COLUMN source_type VARCHAR(255) NOT NULL DEFAULT 'payment'",
      log: "Added missing supplier_cheque.source_type column.",
    },
    {
      name: "source_id",
      sql: "ALTER TABLE supplier_cheque ADD COLUMN source_id VARCHAR(255)",
      log: "Added missing supplier_cheque.source_id column.",
    },
    {
      name: "due_date",
      sql: "ALTER TABLE supplier_cheque ADD COLUMN due_date DATETIME",
      log: "Added missing supplier_cheque.due_date column.",
    },
    {
      name: "status",
      sql: "ALTER TABLE supplier_cheque ADD COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending'",
      log: "Added missing supplier_cheque.status column.",
    },
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(column.sql);
      console.log(column.log);
    }
  }
};

const ensureSupplierPurchaseItemColumns = async () => {
  if (!isSqlite()) return;

  const [tables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_purchase_item'"
  );

  if (tables.length === 0) {
    console.log("supplier_purchase_item table doesn't exist yet.");
    return;
  }

  const [tableInfo] = await sequelize.query("PRAGMA table_info('supplier_purchase_item')");
  const existingColumns = new Set(tableInfo.map((column) => column.name));

  const requiredColumns = [
    {
      name: "supplier_purchase_item_id",
      sql: "ALTER TABLE supplier_purchase_item ADD COLUMN supplier_purchase_item_id VARCHAR(255)",
      log: "Added missing supplier_purchase_item.supplier_purchase_item_id column.",
    },
    {
      name: "supplier_purchase_id",
      sql: "ALTER TABLE supplier_purchase_item ADD COLUMN supplier_purchase_id VARCHAR(255)",
      log: "Added missing supplier_purchase_item.supplier_purchase_id column.",
    },
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      await sequelize.query(column.sql);
      console.log(column.log);
    }
  }
};

const ensureSupplierPurchaseForeignKeyCompatibility = async () => {
  if (!isSqlite()) return;

  const [purchaseTables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_purchase'"
  );
  const [itemTables] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_purchase_item'"
  );

  if (!purchaseTables.length || !itemTables.length) {
    return;
  }

  const [rows] = await sequelize.query(
    "SELECT rowid, supplier_purchase_id FROM supplier_purchase ORDER BY rowid ASC"
  );

  const usedIds = new Set();
  let legacyCounter = 1;

  for (const row of rows) {
    const currentId = typeof row.supplier_purchase_id === 'string' ? row.supplier_purchase_id.trim() : '';
    let nextId = currentId;

    if (!nextId || usedIds.has(nextId)) {
      do {
        nextId = `SUPPUR-LEGACY-${String(legacyCounter).padStart(6, '0')}`;
        legacyCounter += 1;
      } while (usedIds.has(nextId));

      await sequelize.query(
        "UPDATE supplier_purchase SET supplier_purchase_id = :nextId WHERE rowid = :rowid",
        {
          replacements: { nextId, rowid: row.rowid },
        }
      );
    }

    usedIds.add(nextId);
  }

  await sequelize.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_purchase_supplier_purchase_id_unique ON supplier_purchase(supplier_purchase_id)"
  );
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
    await ensureSupplierColumns();
    await ensureSupplierPurchaseColumns();
    await ensureSupplierPaymentColumns();
    await ensureSupplierChequeColumns();
    await ensureSupplierPurchaseItemColumns();
    await ensureSupplierPurchaseForeignKeyCompatibility();

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
