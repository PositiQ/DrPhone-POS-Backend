const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const transaction = sequelize.define(
  "transaction",
  {
    transaction_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    account_id:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM("credit", "debit"),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    transaction_date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    account_balance_before:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    account_balance_after:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    }
  },
  {
    timestamps: true,
    tableName: "transaction",
  },
);

module.exports = transaction;
