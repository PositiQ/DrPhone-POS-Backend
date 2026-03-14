const {
  returnRepairTicket,
  repairPart,
  Product,
  Product_Stock,
} = require("../models");
const generateId = require("../helpers/idGen");
const { Op } = require("sequelize");

const STATUS_LIST = [
  "pending_repair",
  "customer_action_needed",
  "repair_completed_pending_pickup",
  "returned_to_supplier_pending_arrival",
  "came_from_supplier_pending_pickup",
  "cannot_repair",
  "completed",
];

function toNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value, fallback = "pending_repair") {
  const normalized = String(value || "").trim().toLowerCase();
  if (STATUS_LIST.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

async function restoreReturnedStock({ imei, barcode, qty, transaction }) {
  const quantity = Math.max(1, parseInt(qty, 10) || 1);

  if (!imei && !barcode) {
    throw new Error("IMEI or barcode is required to restore stock");
  }

  const productWhere = [];
  if (imei) productWhere.push({ IMEI: imei });
  if (barcode) productWhere.push({ barcode });

  const product = await Product.findOne({
    where: { [Op.or]: productWhere },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!product) {
    throw new Error("Matching product not found for stock return");
  }

  const stock = await Product_Stock.findOne({
    where: { product_id: product.id },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!stock) {
    throw new Error("Stock row not found for matched product");
  }

  const nextQty = toNumber(stock.quantity_in_stock) + quantity;
  await stock.update(
    {
      quantity_in_stock: nextQty,
      status: "active",
      storage_location: stock.storage_location || "Main Shop",
    },
    { transaction }
  );

  return {
    product_id: product.id,
    sku: stock.sku,
    quantity_added: quantity,
    updated_quantity: nextQty,
  };
}

async function adjustStockByIdentity({ imei, barcode, qtyDelta, transaction }) {
  const delta = parseInt(qtyDelta, 10) || 0;
  if (!delta) return null;

  if (!imei && !barcode) {
    throw new Error("IMEI or barcode is required to adjust stock");
  }

  const productWhere = [];
  if (imei) productWhere.push({ IMEI: imei });
  if (barcode) productWhere.push({ barcode });

  const product = await Product.findOne({
    where: { [Op.or]: productWhere },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!product) {
    throw new Error("Matching product not found for stock update");
  }

  const stock = await Product_Stock.findOne({
    where: { product_id: product.id },
    order: [["createdAt", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!stock) {
    throw new Error("Stock row not found for matched product");
  }

  const currentQty = toNumber(stock.quantity_in_stock);
  const nextQty = currentQty + delta;

  if (nextQty < 0) {
    throw new Error("Cannot reduce stock below zero while editing return ticket");
  }

  await stock.update(
    {
      quantity_in_stock: nextQty,
      status: "active",
      storage_location: stock.storage_location || "Main Shop",
    },
    { transaction }
  );

  return {
    product_id: product.id,
    sku: stock.sku,
    quantity_delta: delta,
    updated_quantity: nextQty,
  };
}

exports.getStatusOptions = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: STATUS_LIST,
  });
};

exports.createTicket = async (req, res) => {
  const t = await returnRepairTicket.sequelize.transaction();
  try {
    const ticketType = String(req.body.ticket_type || "").trim().toLowerCase();
    if (!["return", "repair"].includes(ticketType)) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "ticket_type must be return or repair" });
    }

    const payload = {
      ticket_id: await generateId("TKT", t),
      ticket_type: ticketType,
      status: normalizeStatus(req.body.status, ticketType === "return" ? "completed" : "pending_repair"),
      customer_name: req.body.customer_name || null,
      customer_phone: req.body.customer_phone || null,
      customer_email: req.body.customer_email || null,
      device_name: req.body.device_name || null,
      imei: req.body.imei || null,
      barcode: req.body.barcode || null,
      serial_number: req.body.serial_number || null,
      issue_description: req.body.issue_description || null,
      return_reason: req.body.return_reason || null,
      can_return_to_stock: !!req.body.can_return_to_stock,
      return_stock_qty: Math.max(0, parseInt(req.body.return_stock_qty, 10) || 0),
      is_usable_product: req.body.is_usable_product !== false,
      send_back_to_supplier: !!req.body.send_back_to_supplier,
      repair_mode: req.body.repair_mode || null,
      repair_timeline: req.body.repair_timeline || null,
      repair_cost: Number(toNumber(req.body.repair_cost).toFixed(2)),
      external_shop_name: req.body.external_shop_name || null,
      external_shop_location: req.body.external_shop_location || null,
      action_note: req.body.action_note || null,
      supplier_name: req.body.supplier_name || null,
      received_date: req.body.received_date ? new Date(req.body.received_date) : new Date(),
      estimated_completion_date: req.body.estimated_completion_date
        ? new Date(req.body.estimated_completion_date)
        : null,
    };

    if (payload.status === "customer_action_needed" && !String(payload.action_note || "").trim()) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Action note is required for Customer Action Needed status",
      });
    }

    if (ticketType === "return") {
      if (!payload.imei && !payload.barcode) {
        throw new Error("IMEI or barcode is required for return ticket");
      }

      if (!String(payload.return_reason || "").trim()) {
        throw new Error("Return reason is required");
      }

      if (payload.can_return_to_stock) {
        if (!payload.return_stock_qty || payload.return_stock_qty <= 0) {
          throw new Error("Return stock quantity is required when returning to stock");
        }
      }

      // Keep return flow flags consistent:
      // - return-to-stock cannot also be a send-back-to-supplier case
      if (payload.can_return_to_stock) {
        payload.is_usable_product = true;
        payload.send_back_to_supplier = false;
      }

      // Supplier send-back is for unusable stock, not restocked items
      if (payload.send_back_to_supplier) {
        payload.is_usable_product = false;
        payload.can_return_to_stock = false;
      }
    }

    if (ticketType === "repair") {
      if (!payload.repair_mode || !["in_shop", "external_shop", "supplier_return"].includes(payload.repair_mode)) {
        throw new Error("repair_mode is required for repair ticket");
      }

      if (payload.repair_mode === "in_shop") {
        if (!String(payload.device_name || "").trim()) {
          throw new Error("Device name is required for in-shop repairs");
        }
        if (!String(payload.customer_name || "").trim()) {
          throw new Error("Customer name is required for in-shop repairs");
        }
      }

      if (payload.repair_mode === "external_shop") {
        if (!String(payload.external_shop_name || "").trim()) {
          throw new Error("External shop name is required");
        }
        if (!String(payload.external_shop_location || "").trim()) {
          throw new Error("External shop location is required");
        }
      }
    }

    const ticket = await returnRepairTicket.create(payload, { transaction: t });

    let stockResult = null;
    if (ticketType === "return" && payload.can_return_to_stock) {
      stockResult = await restoreReturnedStock({
        imei: payload.imei,
        barcode: payload.barcode,
        qty: payload.return_stock_qty,
        transaction: t,
      });
    }

    const parts = Array.isArray(req.body.parts) ? req.body.parts : [];
    if (ticketType === "repair" && parts.length) {
      for (const part of parts) {
        const partName = String(part.part_name || part.partName || "").trim();
        const qty = Math.max(1, parseInt(part.quantity, 10) || 1);
        const partCost = Number(toNumber(part.part_cost || part.partCost).toFixed(2));

        if (!partName) continue;

        await repairPart.create(
          {
            repair_part_id: await generateId("RPRT", t),
            ticket_id: ticket.ticket_id,
            part_name: partName,
            quantity: qty,
            part_cost: partCost,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
      stock_update: stockResult,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const whereClause = {};

    if (req.query.type) {
      whereClause.ticket_type = String(req.query.type).toLowerCase();
    }

    if (req.query.status) {
      whereClause.status = String(req.query.status).toLowerCase();
    }

    if (req.query.query) {
      const query = String(req.query.query).trim();
      if (query) {
        whereClause[Op.or] = [
          { ticket_id: { [Op.like]: `%${query}%` } },
          { customer_name: { [Op.like]: `%${query}%` } },
          { customer_phone: { [Op.like]: `%${query}%` } },
          { device_name: { [Op.like]: `%${query}%` } },
          { imei: { [Op.like]: `%${query}%` } },
          { barcode: { [Op.like]: `%${query}%` } },
          { issue_description: { [Op.like]: `%${query}%` } },
        ];
      }
    }

    const tickets = await returnRepairTicket.findAll({
      where: whereClause,
      order: [["received_date", "DESC"], ["createdAt", "DESC"]],
      include: [{ model: repairPart, as: "parts" }],
    });

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const tickets = await returnRepairTicket.findAll();

    const summary = {
      total_tickets: tickets.length,
      in_progress: tickets.filter((ticket) => ticket.status === "pending_repair").length,
      pending: tickets.filter((ticket) => ticket.status === "customer_action_needed").length,
      completed_month: tickets.filter((ticket) => {
        const receivedDate = new Date(ticket.received_date || ticket.createdAt);
        const now = new Date();
        return ticket.status === "completed" &&
          receivedDate.getMonth() === now.getMonth() &&
          receivedDate.getFullYear() === now.getFullYear();
      }).length,
    };

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUnusableReturns = async (req, res) => {
  try {
    const rows = await returnRepairTicket.findAll({
      where: {
        ticket_type: "return",
        is_usable_product: false,
        send_back_to_supplier: true,
        can_return_to_stock: false,
      },
      order: [["received_date", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateTicket = async (req, res) => {
  const t = await returnRepairTicket.sequelize.transaction();
  try {
    const { id } = req.params;

    const ticket = await returnRepairTicket.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const ticketType = String(ticket.ticket_type || "").trim().toLowerCase();
    const nextStatus = normalizeStatus(req.body.status, ticket.status);

    const payload = {
      status: nextStatus,
      customer_name: req.body.customer_name ?? ticket.customer_name,
      customer_phone: req.body.customer_phone ?? ticket.customer_phone,
      customer_email: req.body.customer_email ?? ticket.customer_email,
      device_name: req.body.device_name ?? ticket.device_name,
      imei: req.body.imei ?? ticket.imei,
      barcode: req.body.barcode ?? ticket.barcode,
      serial_number: req.body.serial_number ?? ticket.serial_number,
      issue_description: req.body.issue_description ?? ticket.issue_description,
      return_reason: req.body.return_reason ?? ticket.return_reason,
      can_return_to_stock:
        req.body.can_return_to_stock !== undefined
          ? !!req.body.can_return_to_stock
          : !!ticket.can_return_to_stock,
      return_stock_qty:
        req.body.return_stock_qty !== undefined
          ? Math.max(0, parseInt(req.body.return_stock_qty, 10) || 0)
          : Math.max(0, parseInt(ticket.return_stock_qty, 10) || 0),
      is_usable_product:
        req.body.is_usable_product !== undefined
          ? req.body.is_usable_product !== false
          : ticket.is_usable_product,
      send_back_to_supplier:
        req.body.send_back_to_supplier !== undefined
          ? !!req.body.send_back_to_supplier
          : !!ticket.send_back_to_supplier,
      repair_mode: req.body.repair_mode ?? ticket.repair_mode,
      repair_timeline: req.body.repair_timeline ?? ticket.repair_timeline,
      repair_cost:
        req.body.repair_cost !== undefined
          ? Number(toNumber(req.body.repair_cost).toFixed(2))
          : Number(toNumber(ticket.repair_cost).toFixed(2)),
      external_shop_name: req.body.external_shop_name ?? ticket.external_shop_name,
      external_shop_location: req.body.external_shop_location ?? ticket.external_shop_location,
      action_note: req.body.action_note ?? ticket.action_note,
      supplier_name: req.body.supplier_name ?? ticket.supplier_name,
      received_date: req.body.received_date ? new Date(req.body.received_date) : ticket.received_date,
      estimated_completion_date:
        req.body.estimated_completion_date !== undefined
          ? (req.body.estimated_completion_date ? new Date(req.body.estimated_completion_date) : null)
          : ticket.estimated_completion_date,
    };

    if (payload.status === "customer_action_needed" && !String(payload.action_note || "").trim()) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Action note is required for Customer Action Needed status",
      });
    }

    if (ticketType === "return") {
      if (!payload.imei && !payload.barcode) {
        throw new Error("IMEI or barcode is required for return ticket");
      }

      if (!String(payload.return_reason || "").trim()) {
        throw new Error("Return reason is required");
      }

      if (payload.can_return_to_stock && payload.return_stock_qty <= 0) {
        throw new Error("Return stock quantity is required when returning to stock");
      }

      if (payload.can_return_to_stock) {
        payload.is_usable_product = true;
        payload.send_back_to_supplier = false;
      }

      if (payload.send_back_to_supplier) {
        payload.is_usable_product = false;
        payload.can_return_to_stock = false;
      }

      const oldStockQty = ticket.can_return_to_stock ? Math.max(0, parseInt(ticket.return_stock_qty, 10) || 0) : 0;
      const newStockQty = payload.can_return_to_stock ? payload.return_stock_qty : 0;

      if (oldStockQty > 0) {
        await adjustStockByIdentity({
          imei: ticket.imei,
          barcode: ticket.barcode,
          qtyDelta: -oldStockQty,
          transaction: t,
        });
      }

      if (newStockQty > 0) {
        await adjustStockByIdentity({
          imei: payload.imei,
          barcode: payload.barcode,
          qtyDelta: newStockQty,
          transaction: t,
        });
      }

      payload.issue_description = null;
      payload.repair_mode = null;
      payload.repair_timeline = null;
      payload.repair_cost = 0;
      payload.external_shop_name = null;
      payload.external_shop_location = null;
    }

    if (ticketType === "repair") {
      if (!payload.repair_mode || !["in_shop", "external_shop", "supplier_return"].includes(payload.repair_mode)) {
        throw new Error("repair_mode is required for repair ticket");
      }

      if (payload.repair_mode === "in_shop") {
        if (!String(payload.device_name || "").trim()) {
          throw new Error("Device name is required for in-shop repairs");
        }
        if (!String(payload.customer_name || "").trim()) {
          throw new Error("Customer name is required for in-shop repairs");
        }
      }

      if (payload.repair_mode === "external_shop") {
        if (!String(payload.external_shop_name || "").trim()) {
          throw new Error("External shop name is required");
        }
        if (!String(payload.external_shop_location || "").trim()) {
          throw new Error("External shop location is required");
        }
      }

      payload.return_reason = null;
      payload.can_return_to_stock = false;
      payload.return_stock_qty = 0;
      payload.is_usable_product = true;
      payload.send_back_to_supplier = false;
      payload.supplier_name = null;
    }

    await ticket.update(payload, { transaction: t });

    if (ticketType === "repair" && Array.isArray(req.body.parts)) {
      await repairPart.destroy({
        where: { ticket_id: ticket.ticket_id },
        transaction: t,
      });

      for (const part of req.body.parts) {
        const partName = String(part.part_name || part.partName || "").trim();
        const qty = Math.max(1, parseInt(part.quantity, 10) || 1);
        const partCost = Number(toNumber(part.part_cost || part.partCost).toFixed(2));

        if (!partName) continue;

        await repairPart.create(
          {
            repair_part_id: await generateId("RPRT", t),
            ticket_id: ticket.ticket_id,
            part_name: partName,
            quantity: qty,
            part_cost: partCost,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    const updated = await returnRepairTicket.findByPk(ticket.ticket_id, {
      include: [{ model: repairPart, as: "parts" }],
    });

    return res.status(200).json({
      success: true,
      message: "Ticket updated successfully",
      data: updated,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateTicketStatus = async (req, res) => {
  const t = await returnRepairTicket.sequelize.transaction();
  try {
    const { id } = req.params;
    const status = normalizeStatus(req.body.status, "");
    const actionNote = String(req.body.action_note || "").trim();

    if (!status) {
      await t.rollback();
      return res.status(400).json({ success: false, error: "Valid status is required" });
    }

    if (status === "customer_action_needed" && !actionNote) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        error: "Action note is required for Customer Action Needed",
      });
    }

    const ticket = await returnRepairTicket.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!ticket) {
      await t.rollback();
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    await ticket.update(
      {
        status,
        action_note: actionNote || ticket.action_note,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Ticket status updated",
      data: ticket,
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ success: false, error: error.message });
  }
};
