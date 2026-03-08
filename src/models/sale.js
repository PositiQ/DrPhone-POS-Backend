const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const sales = sequelize.define(
  "sales",
  {
    sales_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    total_discount:{
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    total_amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    sales_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status:{
        type: DataTypes.STRING,
        allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "sales",
  },
);

module.exports = sales;
