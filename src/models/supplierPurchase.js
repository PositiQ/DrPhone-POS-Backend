const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const supplierPurchase = sequelize.define(
  "supplierPurchase",
  {
    supplier_purchase_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    supplier_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    amount_paid: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    balance_due: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    payment_type: {
      type: DataTypes.ENUM("full", "partial", "credit"),
      allowNull: false,
      defaultValue: "credit",
    },
    payment_method: {
      type: DataTypes.ENUM("cash", "bank_transfer", "cheque"),
      allowNull: false,
      defaultValue: "cash",
    },
    status: {
      type: DataTypes.ENUM("paid", "pending", "partial", "overdue"),
      allowNull: false,
      defaultValue: "pending",
    },
    purchase_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    account_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cheque_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "supplier_purchase",
  }
);

module.exports = supplierPurchase;
