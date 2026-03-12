const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const shopSales = sequelize.define(
  "shopSales",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    shop_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    total_sales:{
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    total_paid: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    total_outstanding: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    total_devices:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    active_devices:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    sold_devices:{
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    }
  },
  {
    timestamps: true,
    tableName: "shopSales",
  },
);

module.exports = shopSales;
