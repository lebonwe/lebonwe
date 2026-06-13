const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const topProducts = db.prepare(`SELECT p.id, p.name, p.price, 
    SUM(oi.quantity) as total_sold, SUM(oi.unit_price * oi.quantity) as revenue
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_id ORDER BY total_sold DESC LIMIT 5`).all();

  const salesByCategory = db.prepare(`SELECT cat.name, COUNT(oi.id) as total, COALESCE(SUM(oi.unit_price * oi.quantity), 0) as revenue
    FROM order_items oi JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories cat ON p.category_id = cat.id
    GROUP BY cat.id ORDER BY revenue DESC`).all();

  const monthlyRevenue = db.prepare(`SELECT strftime('%Y-%m', created_at) as month,
    COUNT(*) as orders, SUM(total) as revenue
    FROM orders GROUP BY month ORDER BY month DESC LIMIT 12`).all();

  const todayOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now')`).get().c;
  const weekOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE created_at >= datetime('now', '-7 days')`).get().c;

  res.json({ topProducts, salesByCategory, monthlyRevenue, todayOrders, weekOrders });
});

module.exports = router;
