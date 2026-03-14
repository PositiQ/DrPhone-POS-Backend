const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const Stock_Issues = sequelize.define(
  "Stock_Issues",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    product_id:{
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'Products',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
    },
    issued_to:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    issued_shop_id:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    issued_stock:{
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    selling_price:{
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    issued_date:{
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    status:{
        type: DataTypes.ENUM('pending_payment', 'sold'),
        allowNull: false,
    },
    linked_sales_id: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  },
  {
    timestamps: true,
    tableName: "Stock_Issues",
  },
);

module.exports = Stock_Issues;
