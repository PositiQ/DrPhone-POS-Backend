const { DataTypes } = require("sequelize");
const sequelize = require("../config/db.config");

const returnRepairTicket = sequelize.define(
  "returnRepairTicket",
  {
    ticket_id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    ticket_type: {
      type: DataTypes.ENUM("return", "repair"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending_repair",
        "customer_action_needed",
        "repair_completed_pending_pickup",
        "returned_to_supplier_pending_arrival",
        "came_from_supplier_pending_pickup",
        "cannot_repair",
        "completed"
      ),
      allowNull: false,
      defaultValue: "pending_repair",
    },
    customer_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customer_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    device_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imei: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serial_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    issue_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    return_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    can_return_to_stock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    return_stock_qty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    is_usable_product: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    send_back_to_supplier: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    repair_mode: {
      type: DataTypes.ENUM("in_shop", "external_shop", "supplier_return"),
      allowNull: true,
    },
    repair_timeline: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    repair_cost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    external_shop_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    external_shop_location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    supplier_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    received_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estimated_completion_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "return_repair_ticket",
  }
);

module.exports = returnRepairTicket;
