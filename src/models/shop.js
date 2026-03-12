const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const shops = sequelize.define(
  "shops",
  {
    shop_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    location:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    contact_number:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    owner_name:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    owner_customer_id:{
        type: DataTypes.STRING,
        allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "shops",
  },
);

module.exports = shops;
