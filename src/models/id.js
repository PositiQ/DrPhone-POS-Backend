const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const id_gen = sequelize.define(
  "id_gen",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    prefix: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    last_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
  },
  {
    timestamps: true,
    tableName: "id_gen",
  },
);

module.exports = id_gen;
