const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const products = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const categories = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  const orders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const subscribers = db.prepare('SELECT COUNT(*) as c FROM subscribers').get().c;
  const revenue = db.prepare('SELECT COALESCE(SUM(total),0) as c FROM orders WHERE status != ?').get('cancelled').c;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
  const lowStock = db.prepare("SELECT id, name, stock FROM products WHERE stock < 5 ORDER BY stock ASC LIMIT 10").all();

  res.json({ products, categories, orders, subscribers, revenue, recentOrders, lowStock });
});

module.exports = router;
