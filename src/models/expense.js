const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const expense = sequelize.define(
  "expense",
  {
    expense_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    category_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    expense_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "approved",
    },
    account_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "expense",
  },
);

module.exports = expense;