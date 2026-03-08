const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const itemSales = sequelize.define(
  "itemSales",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    sales_id:{
      type: DataTypes.STRING,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unit_price:{
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    discount:{
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    total_price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    sale_date: {
      type: DataTypes.DATE,
      allowNull: false,
    }
  },
  {
    timestamps: true,
    tableName: "item_sales",
  },
);

module.exports = itemSales;
