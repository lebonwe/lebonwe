const { Router } = require('express');
const { db } = require('../config/db');
const router = Router();
router.get('/:orderId', (req, res) => {
  res.json(db.prepare('SELECT m.*, a.name as admin_name FROM messages m LEFT JOIN admin_users a ON m.admin_id = a.id WHERE m.order_id = ? ORDER BY m.created_at ASC').all(req.params.orderId));
});
router.post('/', (req, res) => {
  const { order_id, customer_id, message, admin_id } = req.body;
  if (!message) return res.status(400).json({ error: 'Message requis' });
  const direction = admin_id ? 'admin' : 'customer';
  db.prepare('INSERT INTO messages (order_id, customer_id, admin_id, message, direction) VALUES (?, ?, ?, ?, ?)').run(order_id || null, customer_id || null, admin_id || null, message, direction);
  res.status(201).json({ message: 'Message envoyé' });
});
module.exports = router;
