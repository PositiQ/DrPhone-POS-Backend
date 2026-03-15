const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { user, userRole } = require('../models');
const { JWT_SECRET, sanitizeUser } = require('../middleware/auth');
const { normalizePermissions } = require('../helpers/authPermissions');

const ACCESS_TOKEN_TTL = 60 * 60 * 24 * 30;
const REMEMBER_TOKEN_DAYS = 365;

function createAccessToken(record) {
  return jwt.sign(
    {
      sub: record.user_id,
      email: record.email,
      role: record.role?.name || '',
      permissions: normalizePermissions(record.role?.permissions || []),
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function createRememberToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashRememberToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

async function findUserByEmail(email) {
  return user.findOne({
    where: { email: String(email || '').trim().toLowerCase() },
    include: [{ model: userRole, as: 'role' }],
  });
}

function buildAuthPayload(record, token, rememberToken, rememberTokenExpiresAt) {
  return {
    token,
    user: sanitizeUser(record),
    rememberToken: rememberToken || '',
    rememberTokenExpiresAt: rememberTokenExpiresAt || null,
  };
}

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const rememberMe = Boolean(req.body.rememberMe);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const record = await findUserByEmail(email);
    if (!record || String(record.status).toLowerCase() !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, record.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = createAccessToken(record);
    let rememberToken = '';
    let rememberTokenExpiresAt = null;

    if (rememberMe) {
      rememberToken = createRememberToken();
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + REMEMBER_TOKEN_DAYS);
      rememberTokenExpiresAt = expiry.toISOString();
      record.remember_token_hash = hashRememberToken(rememberToken);
      record.remember_token_expires_at = expiry;
    } else {
      record.remember_token_hash = null;
      record.remember_token_expires_at = null;
    }

    record.last_login_at = new Date();
    await record.save();
    await record.reload({ include: [{ model: userRole, as: 'role' }] });

    res.json({
      success: true,
      data: buildAuthPayload(record, token, rememberToken, rememberTokenExpiresAt),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.remember = async (req, res) => {
  try {
    const rememberToken = String(req.body.rememberToken || '');
    if (!rememberToken) {
      return res.status(400).json({ success: false, message: 'Remember token is required.' });
    }

    const tokenHash = hashRememberToken(rememberToken);
    const record = await user.findOne({
      where: { remember_token_hash: tokenHash },
      include: [{ model: userRole, as: 'role' }],
    });

    if (!record || String(record.status).toLowerCase() !== 'active') {
      return res.status(401).json({ success: false, message: 'Remember token is invalid.' });
    }

    const expiresAt = record.remember_token_expires_at ? new Date(record.remember_token_expires_at) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      record.remember_token_hash = null;
      record.remember_token_expires_at = null;
      await record.save();
      return res.status(401).json({ success: false, message: 'Remember token has expired.' });
    }

    const token = createAccessToken(record);
    res.json({
      success: true,
      data: buildAuthPayload(record, token, '', expiresAt.toISOString()),
    });
  } catch (error) {
    console.error('Remember token error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const authUser = req.authUser;
    if (authUser) {
      await user.update(
        {
          remember_token_hash: null,
          remember_token_expires_at: null,
        },
        { where: { user_id: authUser.user_id } }
      );
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.me = async (req, res) => {
  res.json({ success: true, data: req.authUser });
};

exports.updateProfile = async (req, res) => {
  try {
    const authUser = req.authUser;
    const record = await user.findOne({
      where: { user_id: authUser.user_id },
      include: [{ model: userRole, as: 'role' }],
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const emailInUse = await user.findOne({ where: { email } });
    if (emailInUse && emailInUse.user_id !== authUser.user_id) {
      return res.status(409).json({ success: false, message: 'Email address is already in use.' });
    }

    record.name = name;
    record.phone = phone || 'N/A';
    record.email = email;
    await record.save();
    await record.reload({ include: [{ model: userRole, as: 'role' }] });

    const token = createAccessToken(record);
    res.json({ success: true, data: { token, user: sanitizeUser(record) } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const authUser = req.authUser;
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword = String(req.body.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const record = await user.findOne({
      where: { user_id: authUser.user_id },
      include: [{ model: userRole, as: 'role' }],
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, record.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    record.password_hash = await bcrypt.hash(newPassword, 10);
    record.remember_token_hash = null;
    record.remember_token_expires_at = null;
    await record.save();
    await record.reload({ include: [{ model: userRole, as: 'role' }] });

    const token = createAccessToken(record);
    res.json({ success: true, data: { token, user: sanitizeUser(record) } });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
