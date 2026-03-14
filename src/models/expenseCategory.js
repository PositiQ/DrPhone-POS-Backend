const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const expenseCategory = sequelize.define(
  "expense_category",
  {
    category_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "expense_category",
  },
);

module.exports = expenseCategory;