const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const drawerAccount = sequelize.define(
  "drawerAccount",
  {
    drawer_acc_id:{
        type: DataTypes.STRING,
        primaryKey: true,
    },
    acc_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    location:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    added_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    }
  },
  {
    timestamps: true,
    tableName: "drawerAccount",
  },
);

module.exports = drawerAccount;
