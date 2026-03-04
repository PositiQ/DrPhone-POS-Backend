const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const customer = sequelize.define(
  "customer",
  {
    customer_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    phone_number:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    atlernative_phone_number:{
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    nic_or_passport_number:{
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    dob:{
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    gender:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    type:{
        type: DataTypes.STRING,
        allowNull: false,
        ENUM: ['regular', 'wholesale'],
    },

    address:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    city:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    district:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    postal_code:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    country:{
        type: DataTypes.STRING,
        allowNull: true,
    },



    credit_limit:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
    },
    credit_days:{
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
    },
    discount_rate:{
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
    },
    prefferred_payment_method:{
        type: DataTypes.STRING,
        allowNull: true,
    },


    registration_date:{
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    status:{
        type: DataTypes.STRING,
        allowNull: false,
        ENUM: ['active', 'inactive'],
    },
    reffered_by:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    note:{
        type: DataTypes.TEXT,
        allowNull: true,
    }


  },
  {
    timestamps: true,
    tableName: "customer",
  },
);

module.exports = customer;
