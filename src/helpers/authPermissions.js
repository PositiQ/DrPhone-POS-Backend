const AVAILABLE_PERMISSIONS = [
  'dashboard.view',
  'sales.view',
  'sales.manage',
  'inventory.view',
  'inventory.manage',
  'products.view',
  'products.manage',
  'customers.view',
  'customers.manage',
  'invoices.view',
  'vault.view',
  'vault.manage',
  'expenses.view',
  'expenses.manage',
  'suppliers.view',
  'suppliers.manage',
  'shops.view',
  'shops.manage',
  'returns_repairs.view',
  'returns_repairs.manage',
  'settings.view',
  'settings.manage',
  'users.view',
  'users.manage',
  'roles.manage',
  'profile.manage',
];

const PAGE_PERMISSION_MAP = {
  dashboard: 'dashboard.view',
  sales: 'sales.view',
  inventory: 'inventory.view',
  products: 'products.view',
  customers: 'customers.view',
  'invoices-quotations': 'invoices.view',
  'vault-balance': 'vault.view',
  expenses: 'expenses.view',
  suppliers: 'suppliers.view',
  shops: 'shops.view',
  'returns-repairs': 'returns_repairs.view',
  settings: 'settings.view',
  users: 'users.view',
  profile: 'profile.manage',
};

function normalizePermissions(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.filter(Boolean).map((item) => String(item).trim())));
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return normalizePermissions(parsed);
    } catch (_) {
      return normalizePermissions(value.split(','));
    }
  }

  return [];
}

function hasPermission(permissions, requiredPermission) {
  const normalized = normalizePermissions(permissions);
  if (!requiredPermission) {
    return true;
  }

  return normalized.includes('*') || normalized.includes(requiredPermission);
}

module.exports = {
  AVAILABLE_PERMISSIONS,
  PAGE_PERMISSION_MAP,
  normalizePermissions,
  hasPermission,
};
