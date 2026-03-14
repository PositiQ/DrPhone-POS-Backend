const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const supplierPayment = sequelize.define(
  "supplierPayment",
  {
    supplier_payment_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    supplier_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM("cash", "bank_transfer", "cheque"),
      allowNull: false,
      defaultValue: "cash",
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("completed", "pending_cheque", "failed"),
      allowNull: false,
      defaultValue: "completed",
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
    tableName: "supplier_payment",
  }
);

module.exports = supplierPayment;
