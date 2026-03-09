const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  productName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  brand:{
    type: DataTypes.STRING,
    allowNull: false,
  },
  model:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  color:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  capacity:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  condition:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  warrenty:{
    type: DataTypes.STRING,
    allowNull: true,
  },
  IMEI:{
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  barcode:{
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  serialNumber:{
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  product_type: {
    type: DataTypes.ENUM('phone', 'accessory'),
    allowNull: false,
    defaultValue: 'phone',
  },
}, {
  timestamps: true,
  tableName: 'products',
});

module.exports = Product;
