const sequelize = require('../config/db.config');

// Ordered by dependency (children first) for safe deletion
const ALL_TABLES = [
  'repair_part',
  'item_sales',
  'customer_sales',
  'Stock_Issues',
  'shopSales',
  'supplier_cheque',
  'supplier_payment',
  'supplier_purchase_item',
  'supplier_purchase',
  'return_repair_ticket',
  'expense',
  'transaction',
  'bankAccount',
  'drawerAccount',
  'sales',
  'Product_Stock',
  'products',
  'account',
  'expense_category',
  'customer',
  'shops',
  'supplier',
  'id_gen',
  'app_settings',
];

const RESET_GROUPS = {
  sales: {
    label: 'Sales & Invoices',
    description: 'All sales records and invoice items',
    tables: ['item_sales', 'customer_sales', 'sales'],
  },
  products: {
    label: 'Products & Inventory',
    description: 'Product catalog, stock levels, and stock issues',
    tables: ['Stock_Issues', 'Product_Stock', 'products'],
  },
  customers: {
    label: 'Customers',
    description: 'All customer records and purchase history',
    tables: ['customer_sales', 'customer'],
  },
  vault: {
    label: 'Vault & Transactions',
    description: 'Bank/drawer accounts and all transactions',
    tables: ['transaction', 'bankAccount', 'drawerAccount', 'account'],
  },
  expenses: {
    label: 'Expenses',
    description: 'All expense records and categories',
    tables: ['expense', 'expense_category'],
  },
  shops: {
    label: 'Shops & Stock Issues',
    description: 'Shop records, issued stock, and settlements',
    tables: ['Stock_Issues', 'shopSales', 'shops'],
  },
  suppliers: {
    label: 'Suppliers',
    description: 'Supplier records, purchases, payments, and cheques',
    tables: ['supplier_cheque', 'supplier_payment', 'supplier_purchase_item', 'supplier_purchase', 'supplier'],
  },
  returns: {
    label: 'Returns & Repairs',
    description: 'All return/repair tickets and repair parts',
    tables: ['repair_part', 'return_repair_ticket'],
  },
};

async function disableForeignKeys() {
  const dialect = sequelize.getDialect ? sequelize.getDialect() : 'sqlite';
  if (dialect === 'mysql') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  } else {
    await sequelize.query('PRAGMA foreign_keys = OFF');
  }
}

async function enableForeignKeys() {
  const dialect = sequelize.getDialect ? sequelize.getDialect() : 'sqlite';
  if (dialect === 'mysql') {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  } else {
    await sequelize.query('PRAGMA foreign_keys = ON');
  }
}

async function deleteTable(tableName) {
  try {
    await sequelize.query(`DELETE FROM \`${tableName}\``);
  } catch {
    // SQLite uses double-quote identifiers
    await sequelize.query(`DELETE FROM "${tableName}"`);
  }
}

exports.getResetGroups = (req, res) => {
  const groups = Object.entries(RESET_GROUPS).map(([key, val]) => ({
    key,
    label: val.label,
    description: val.description,
  }));
  res.json({ success: true, data: groups });
};

exports.resetSelective = async (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ success: false, message: 'No groups specified for reset.' });
  }

  // Collect tables in dependency order (from ALL_TABLES), deduplicated
  const requestedTables = new Set();
  for (const groupKey of groups) {
    const group = RESET_GROUPS[groupKey];
    if (group) {
      group.tables.forEach((t) => requestedTables.add(t));
    }
  }

  const orderedTables = ALL_TABLES.filter((t) => requestedTables.has(t));

  if (orderedTables.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid tables found for the selected groups.' });
  }

  try {
    await disableForeignKeys();
    for (const table of orderedTables) {
      await deleteTable(table);
    }
    await enableForeignKeys();

    res.json({
      success: true,
      message: `Reset completed for: ${groups.join(', ')}`,
      clearedTables: orderedTables,
    });
  } catch (error) {
    try { await enableForeignKeys(); } catch (_) {}
    console.error('Selective reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetFull = async (req, res) => {
  try {
    await disableForeignKeys();
    for (const table of ALL_TABLES) {
      await deleteTable(table);
    }
    await enableForeignKeys();

    res.json({
      success: true,
      message: 'Full system reset completed. All data has been permanently cleared.',
    });
  } catch (error) {
    try { await enableForeignKeys(); } catch (_) {}
    console.error('Full reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
