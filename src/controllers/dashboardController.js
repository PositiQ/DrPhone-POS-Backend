const { sales, itemSales, Product, Product_Stock, customer } = require('../models');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDateISO(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toISOString().slice(0, 10);
}

exports.getOverview = async (req, res) => {
  try {
    const todayStart = startOfToday();
    const weekStart = startOfWeekMonday();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [allSales, allProducts, customersCount] = await Promise.all([
      sales.findAll({
        include: [
          { model: customer, as: 'customer', attributes: ['customer_id', 'name'] },
          {
            model: itemSales,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'productName', 'brand', 'model'] }],
          },
        ],
        order: [['sales_date', 'DESC']],
      }),
      Product.findAll({ include: [Product_Stock] }),
      customer.count(),
    ]);

    const todaySalesRows = allSales.filter((row) => new Date(row.sales_date) >= todayStart);
    const todaysSales = todaySalesRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const todaysOrders = todaySalesRows.length;

    const productsCount = allProducts.length;

    let lowStock = 0;
    let outOfStock = 0;
    let issued = 0;

    for (const p of allProducts) {
      const s = p.Product_Stock;
      if (!s) continue;
      const qty = Number(s.quantity_in_stock || 0);
      const min = Number(s.minimum_stock_level || 0);
      const status = String(s.status || '').toLowerCase();

      if (status === 'issued') {
        issued += 1;
      }
      if (qty <= 0 || status === 'sold' || status === 'discontinued' || status === 'inactive') {
        outOfStock += 1;
      } else if (min > 0 && qty <= min) {
        lowStock += 1;
      }
    }

    const weeklySales = [0, 0, 0, 0, 0, 0, 0];
    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (const row of allSales) {
      const d = new Date(row.sales_date);
      if (d < weekStart || d >= weekEnd) continue;
      const jsDay = d.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      weeklySales[idx] += Number(row.total_amount || 0);
    }

    const productAgg = new Map();
    for (const row of allSales) {
      const items = Array.isArray(row.items) ? row.items : [];
      for (const item of items) {
        const productName = item.product?.productName || item.productName || item.product_id || 'Unknown Product';
        const quantity = Number(item.quantity || 0);
        const amount = Number(item.total_price || (item.unit_price || 0) * quantity || 0);
        const current = productAgg.get(productName) || { name: productName, qty: 0, amount: 0 };
        current.qty += quantity;
        current.amount += amount;
        productAgg.set(productName, current);
      }
    }

    const topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const totalTopAmount = topProducts.reduce((s, p) => s + p.amount, 0) || 1;
    const topProductsWithPct = topProducts.map((p) => ({
      ...p,
      percentage: Math.round((p.amount / totalTopAmount) * 100),
    }));

    const recentInvoices = allSales.slice(0, 5).map((row) => ({
      invoiceNo: row.sales_id,
      customer: row.customer?.name || 'Walk-in Customer',
      date: formatDateISO(row.sales_date),
      amount: Number(row.total_amount || 0),
      status: String(row.status || 'pending').toLowerCase(),
    }));

    const lowStockMsg = `${lowStock} products are running low on stock.`;
    const outStockMsg = `${outOfStock} items are out of stock!`;

    res.json({
      success: true,
      data: {
        alerts: {
          lowStock,
          outOfStock,
          text: `${lowStockMsg} ${outStockMsg}`,
        },
        stats: {
          todaysSales,
          todaysOrders,
          productsCount,
          customersCount,
          lowStock,
          issued,
        },
        salesOverview: {
          labels: weekdayLabels,
          values: weeklySales,
        },
        topProducts: topProductsWithPct,
        recentInvoices,
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
