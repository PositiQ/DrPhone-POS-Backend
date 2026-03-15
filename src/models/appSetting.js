const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const appSetting = sequelize.define(
  'app_setting',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    business_name: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Doctor Phone',
    },
    business_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    business_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    business_website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    business_address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    business_logo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'LKR - Sri Lankan Rupees',
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Asia/Colombo (GMT+5:30)',
    },
    date_format: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'MMM DD, YYYY',
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'English',
    },
    invoice_prefix: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INV-',
    },
    next_invoice_no: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    invoice_footer: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: 'Thank you for your business! Please contact us for any queries.',
    },
  },
  {
    timestamps: true,
    tableName: 'app_settings',
  }
);

module.exports = appSetting;
