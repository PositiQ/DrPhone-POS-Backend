const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const userRole = sequelize.define('userRole', {
  role_id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  permissions: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: 'user_role',
});

module.exports = userRole;
