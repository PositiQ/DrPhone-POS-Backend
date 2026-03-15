const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { user, userRole } = require('../models');
const { AVAILABLE_PERMISSIONS, normalizePermissions } = require('../helpers/authPermissions');
const { sanitizeUser } = require('../middleware/auth');

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function serializeRole(roleRecord) {
  return {
    role_id: roleRecord.role_id,
    name: roleRecord.name,
    description: roleRecord.description || '',
    permissions: normalizePermissions(roleRecord.permissions),
    is_system: Boolean(roleRecord.is_system),
    createdAt: roleRecord.createdAt,
    updatedAt: roleRecord.updatedAt,
  };
}

async function getUserRecord(userId) {
  return user.findOne({
    where: { user_id: userId },
    include: [{ model: userRole, as: 'role' }],
  });
}

exports.getPermissions = async (req, res) => {
  res.json({ success: true, data: AVAILABLE_PERMISSIONS });
};

exports.listRoles = async (req, res) => {
  try {
    const records = await userRole.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: records.map(serializeRole) });
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const permissions = normalizePermissions(req.body.permissions || []);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required.' });
    }

    const existing = await userRole.findOne({ where: { name } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Role name already exists.' });
    }

    const record = await userRole.create({
      role_id: createId('ROLE'),
      name,
      description,
      permissions: JSON.stringify(permissions),
      is_system: false,
    });

    res.status(201).json({ success: true, data: serializeRole(record) });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const record = await userRole.findOne({ where: { role_id: req.params.roleId } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const permissions = normalizePermissions(req.body.permissions || []);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required.' });
    }

    const conflict = await userRole.findOne({
      where: {
        name,
        role_id: { [Op.ne]: record.role_id },
      },
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'Role name already exists.' });
    }

    record.name = name;
    record.description = description;
    record.permissions = JSON.stringify(permissions);
    await record.save();

    res.json({ success: true, data: serializeRole(record) });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const records = await user.findAll({
      include: [{ model: userRole, as: 'role' }],
      order: [['createdAt', 'DESC']],
    });

    const rows = records.map(sanitizeUser);
    const stats = {
      total: rows.length,
      active: rows.filter((item) => String(item.status).toLowerCase() === 'active').length,
      admins: rows.filter((item) => String(item.role?.name || '').toLowerCase() === 'admin').length,
      online: rows.filter((item) => item.last_login_at).length,
    };

    res.json({ success: true, data: { stats, users: rows } });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim() || 'N/A';
    const password = String(req.body.password || '');
    const roleId = String(req.body.role_id || '').trim();
    const status = String(req.body.status || 'active').trim().toLowerCase();

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existing = await user.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email address is already in use.' });
    }

    const roleRecord = await userRole.findOne({ where: { role_id: roleId } });
    if (!roleRecord) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    const record = await user.create({
      user_id: createId('USER'),
      name,
      email,
      phone,
      password_hash: await bcrypt.hash(password, 10),
      role_id: roleRecord.role_id,
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    const created = await getUserRecord(record.user_id);
    res.status(201).json({ success: true, data: sanitizeUser(created) });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const record = await getUserRecord(req.params.userId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim() || 'N/A';
    const roleId = String(req.body.role_id || '').trim();
    const status = String(req.body.status || 'active').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !roleId) {
      return res.status(400).json({ success: false, message: 'Name, email, and role are required.' });
    }

    const existing = await user.findOne({
      where: {
        email,
        user_id: { [Op.ne]: record.user_id },
      },
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email address is already in use.' });
    }

    const roleRecord = await userRole.findOne({ where: { role_id: roleId } });
    if (!roleRecord) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    if (req.authUser && req.authUser.user_id === record.user_id) {
      if (status !== 'active') {
        return res.status(400).json({ success: false, message: 'Use your own profile to manage your account. You cannot deactivate yourself here.' });
      }
      if (roleId !== record.role_id) {
        return res.status(400).json({ success: false, message: 'Use another admin account to change your role.' });
      }
    }

    record.name = name;
    record.email = email;
    record.phone = phone;
    record.role_id = roleId;
    record.status = status === 'inactive' ? 'inactive' : 'active';

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
      }
      record.password_hash = await bcrypt.hash(password, 10);
      record.remember_token_hash = null;
      record.remember_token_expires_at = null;
    }

    await record.save();
    const updated = await getUserRecord(record.user_id);
    res.json({ success: true, data: sanitizeUser(updated) });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
