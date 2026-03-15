const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const user = sequelize.define('user', {
  user_id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'active',
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  remember_token_hash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  remember_token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'user',
});

module.exports = user;
