const { Op } = require('sequelize');
const { Product, Product_Stock, sales, supplierPurchase, supplierCheque, supplier, returnRepairTicket } = require('../models');

function toRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

function createNotif({ id, type, icon, iconBg, iconColor, message, timestamp, unread = true, priority = 0 }) {
  return {
    id,
    type,
    icon,
    iconBg,
    iconColor,
    message,
    timestamp,
    relativeTime: toRelativeTime(timestamp),
    unread,
    priority,
  };
}

function stamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '0';
  return String(date.getTime());
}

exports.getNotifications = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [stocks, recentSales, overduePurchases, overdueCheques, overdueRepairs] = await Promise.all([
      Product.findAll({
        include: [{ model: Product_Stock }],
      }),
      sales.findAll({
        where: {
          sales_date: {
            [Op.gte]: todayStart,
          },
        },
        order: [['sales_date', 'DESC']],
        limit: 10,
      }),
      supplierPurchase.findAll({
        where: {
          [Op.or]: [
            { status: 'overdue' },
            {
              balance_due: {
                [Op.gt]: 0,
              },
            },
          ],
        },
        include: [{ model: supplier, as: 'supplier', attributes: ['name'] }],
        order: [['purchase_date', 'ASC']],
        limit: 10,
      }),
      supplierCheque.findAll({
        where: {
          [Op.or]: [
            { status: 'overdue' },
            {
              due_date: {
                [Op.lt]: now,
              },
              status: {
                [Op.in]: ['pending', 'overdue'],
              },
            },
          ],
        },
        include: [{ model: supplier, as: 'supplier', attributes: ['name'] }],
        order: [['due_date', 'ASC']],
        limit: 10,
      }),
      returnRepairTicket.findAll({
        where: {
          ticket_type: 'repair',
          estimated_completion_date: {
            [Op.lt]: now,
          },
          status: {
            [Op.notIn]: ['completed', 'repair_completed_pending_pickup'],
          },
        },
        order: [['estimated_completion_date', 'ASC']],
        limit: 10,
      }),
    ]);

    const notifications = [];

    // Low stock and out-of-stock item notifications
    stocks.forEach((product) => {
      const stock = product.Product_Stock;
      if (!stock) return;

      const qty = Number(stock.quantity_in_stock || 0);
      const min = Number(stock.minimum_stock_level || 0);
      const status = String(stock.status || '').toLowerCase();

      if (qty <= 0 || status === 'sold' || status === 'discontinued' || status === 'inactive') {
        notifications.push(createNotif({
          id: `stock-out-${product.id}-${status}-${qty}-${stamp(stock.updatedAt || stock.createdAt)}`,
          type: 'out_of_stock',
          icon: 'fa-exclamation-triangle',
          iconBg: '#fce4ec',
          iconColor: '#e91e63',
          message: `${product.productName || product.id} is out of stock.`,
          timestamp: stock.updatedAt || stock.createdAt || now,
          priority: 5,
        }));
      } else if (min > 0 && qty <= min) {
        notifications.push(createNotif({
          id: `stock-low-${product.id}-${qty}-${min}-${stamp(stock.updatedAt || stock.createdAt)}`,
          type: 'low_stock',
          icon: 'fa-box',
          iconBg: '#e8eaf6',
          iconColor: '#3f51b5',
          message: `${product.productName || product.id} is low on stock (${qty} left).`,
          timestamp: stock.updatedAt || stock.createdAt || now,
          priority: 4,
        }));
      }
    });

    // New sales notifications
    recentSales.forEach((sale) => {
      notifications.push(createNotif({
        id: `sale-${sale.sales_id}-${stamp(sale.sales_date || sale.createdAt)}`,
        type: 'new_sale',
        icon: 'fa-shopping-bag',
        iconBg: '#e8f5e9',
        iconColor: '#4caf50',
        message: `New sale ${sale.sales_id} created for LKR ${Number(sale.total_amount || 0).toLocaleString()}.`,
        timestamp: sale.sales_date || sale.createdAt || now,
        priority: 3,
      }));
    });

    // Supplier overdue payment notifications (purchase balances)
    overduePurchases.forEach((purchase) => {
      const supplierName = purchase.supplier?.name || purchase.supplier_id || 'Supplier';
      const due = Number(purchase.balance_due || 0).toLocaleString();
      notifications.push(createNotif({
        id: `supplier-purchase-overdue-${purchase.supplier_purchase_id}-${Number(purchase.balance_due || 0)}-${String(purchase.status || '')}-${stamp(purchase.updatedAt || purchase.purchase_date || purchase.createdAt)}`,
        type: 'supplier_overdue',
        icon: 'fa-file-invoice-dollar',
        iconBg: '#fff3e0',
        iconColor: '#ff9800',
        message: `${supplierName} has overdue purchase balance of LKR ${due}.`,
        timestamp: purchase.purchase_date || purchase.createdAt || now,
        priority: 4,
      }));
    });

    // Supplier overdue payment notifications (cheques)
    overdueCheques.forEach((cheque) => {
      const supplierName = cheque.supplier?.name || cheque.supplier_id || 'Supplier';
      const amount = Number(cheque.amount || 0).toLocaleString();
      notifications.push(createNotif({
        id: `supplier-cheque-overdue-${cheque.supplier_cheque_id}-${Number(cheque.amount || 0)}-${String(cheque.status || '')}-${stamp(cheque.updatedAt || cheque.due_date || cheque.createdAt)}`,
        type: 'supplier_overdue',
        icon: 'fa-money-check-alt',
        iconBg: '#fff3e0',
        iconColor: '#ef6c00',
        message: `Cheque overdue for ${supplierName}: LKR ${amount}.`,
        timestamp: cheque.due_date || cheque.createdAt || now,
        priority: 4,
      }));
    });

    // Repair estimated completion overdue notifications
    overdueRepairs.forEach((ticket) => {
      const dueDate = ticket.estimated_completion_date ? new Date(ticket.estimated_completion_date).toLocaleDateString() : 'N/A';
      notifications.push(createNotif({
        id: `repair-overdue-${ticket.ticket_id}-${String(ticket.status || '')}-${stamp(ticket.estimated_completion_date || ticket.updatedAt || ticket.createdAt)}`,
        type: 'repair_overdue',
        icon: 'fa-tools',
        iconBg: '#e3f2fd',
        iconColor: '#2196f3',
        message: `Repair ${ticket.ticket_id} (${ticket.device_name || 'Device'}) exceeded estimated date (${dueDate}).`,
        timestamp: ticket.estimated_completion_date || ticket.updatedAt || now,
        priority: 5,
      }));
    });

    notifications.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const maxItems = Number(req.query.limit || 25);
    const limited = notifications.slice(0, Math.max(1, Math.min(maxItems, 100)));

    const summary = {
      total: notifications.length,
      unread: limited.length,
      lowStock: notifications.filter((n) => n.type === 'low_stock').length,
      outOfStock: notifications.filter((n) => n.type === 'out_of_stock').length,
      newSales: notifications.filter((n) => n.type === 'new_sale').length,
      supplierOverdues: notifications.filter((n) => n.type === 'supplier_overdue').length,
      repairOverdues: notifications.filter((n) => n.type === 'repair_overdue').length,
    };

    res.json({ success: true, data: { summary, notifications: limited } });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
