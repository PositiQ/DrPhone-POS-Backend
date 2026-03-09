const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const account = sequelize.define(
  "account",
  {
    acc_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    type:{
        type: DataTypes.ENUM("bank", "drawer"),
        allowNull: false,
    },
    available_balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "account",
  },
);

module.exports = account;
