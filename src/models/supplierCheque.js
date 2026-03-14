const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const supplierCheque = sequelize.define(
  "supplierCheque",
  {
    supplier_cheque_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    supplier_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    source_type: {
      type: DataTypes.ENUM("purchase", "payment"),
      allowNull: false,
    },
    source_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cheque_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cheque_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("pending", "cleared", "bounced", "overdue"),
      allowNull: false,
      defaultValue: "pending",
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "supplier_cheque",
  }
);

module.exports = supplierCheque;
