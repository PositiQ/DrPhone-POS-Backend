const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const customer_sales = sequelize.define(
  "customer_sales",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "customer",
        key: "customer_id",
      },
    },
    total_sales_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    last_sales_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_due_available: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    paid_amount:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    payment_status:{
        type: DataTypes.STRING,
        allowNull: false,
        ENUM: ['paid', 'pending', 'overdue'],
    }
  },
  {
    timestamps: true,
    tableName: "customer_sales",
  },
);

module.exports = customer_sales;
