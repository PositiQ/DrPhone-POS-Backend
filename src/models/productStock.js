const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Product_Stock = sequelize.define(
  "Product_Stock",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id:{
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    selling_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    wholesale_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    profit_margin:{
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
    },

    supplier: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    minimum_stock_level: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    quantity_in_stock: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    storage_location: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    date_added:{
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    status:{
        type: DataTypes.ENUM('active', 'inactive', 'discontinued', 'sold', 'issued'),
        allowNull: false,
        defaultValue: 'active',
    }
  },
  {
    timestamps: true,
    tableName: "Product_Stock",
  },
);

module.exports = Product_Stock;
