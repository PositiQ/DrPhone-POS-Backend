const jwt = require('jsonwebtoken');
const { user, userRole } = require('../models');
const { normalizePermissions, hasPermission } = require('../helpers/authPermissions');

const JWT_SECRET = process.env.JWT_SECRET || 'positiq-dev-secret';

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return header.slice(7).trim();
}

function sanitizeUser(record) {
  if (!record) {
    return null;
  }

  const role = record.role || null;
  const permissions = role ? normalizePermissions(role.permissions) : [];

  return {
    user_id: record.user_id,
    name: record.name,
    email: record.email,
    phone: record.phone || 'N/A',
    status: record.status,
    role: role ? {
      role_id: role.role_id,
      name: role.name,
      description: role.description || '',
      permissions,
      is_system: Boolean(role.is_system),
    } : null,
    permissions,
    last_login_at: record.last_login_at,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function authenticate(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token is required.' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const record = await user.findOne({
      where: { user_id: payload.sub },
      include: [{ model: userRole, as: 'role' }],
    });

    if (!record || String(record.status).toLowerCase() !== 'active') {
      return res.status(401).json({ success: false, message: 'User account is not available.' });
    }

    req.authToken = token;
    req.authUser = sanitizeUser(record);
    next();
  } catch (_) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    if (!req.authUser) {
      return res.status(401).json({ success: false, message: 'Authentication is required.' });
    }

    if (!hasPermission(req.authUser.permissions, permission)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticate,
  requirePermission,
  sanitizeUser,
};
