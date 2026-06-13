const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const customers = db.prepare(`SELECT c.id, c.name, c.email, c.phone, c.address, c.created_at,
    (SELECT COUNT(*) FROM customer_orders co WHERE co.customer_id = c.id) as order_count,
    (SELECT COALESCE(SUM(o.total), 0) FROM customer_orders co JOIN orders o ON co.order_id = o.id WHERE co.customer_id = c.id) as total_spent
    FROM customers c ORDER BY c.created_at DESC`).all();
  res.json(customers);
});

router.get('/:id/orders', (req, res) => {
  const orders = db.prepare(`SELECT o.* FROM customer_orders co
    JOIN orders o ON co.order_id = o.id WHERE co.customer_id = ? ORDER BY o.created_at DESC`).all(req.params.id);
  for (const o of orders) {
    o.items = db.prepare(`SELECT oi.*, p.name as product_name, p.image
      FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`).all(o.id);
  }
  res.json(orders);
});

module.exports = router;
