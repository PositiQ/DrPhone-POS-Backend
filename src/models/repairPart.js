const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const repairPart = sequelize.define(
  "repairPart",
  {
    repair_part_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    part_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    part_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "repair_part",
  }
);

module.exports = repairPart;
