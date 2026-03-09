const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const bankAccount = sequelize.define(
  "bankAccount",
  {
    bank_acc_id:{
        type: DataTypes.STRING,
        primaryKey: true,
    },
    acc_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bank_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    branch_name:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    account_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    account_holder_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    added_date:{
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
  },
  {
    timestamps: true,
    tableName: "bankAccount",
  },
);

module.exports = bankAccount;
