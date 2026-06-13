const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.post('/send', (req, res) => {
  const { customer_id, type, title, message, link } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'titre et message requis' });
  if (customer_id) {
    db.prepare('INSERT INTO notifications (customer_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)').run(
      customer_id, type || 'info', title, message, link || null);
  } else {
    const all = db.prepare('SELECT id FROM customers').all();
    for (const c of all) {
      db.prepare('INSERT INTO notifications (customer_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)').run(
        c.id, type || 'info', title, message, link || null);
    }
  }
  res.json({ message: 'Notification envoyée' });
});

router.post('/order-status', (req, res) => {
  const { order_id, status } = req.body;
  const order = db.prepare('SELECT co.customer_id, o.id FROM customer_orders co JOIN orders o ON co.order_id = o.id WHERE co.order_id = ?').get(order_id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const labels = { pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };
  db.prepare(`INSERT INTO notifications (customer_id, type, title, message, link)
    VALUES (?, 'order', 'Commande #' || ?, 'Votre commande est ' || ?, ?)`).run(
    order.customer_id, order_id, labels[status] || status, '/account');
  res.json({ message: 'Notification envoyée' });
});

module.exports = router;
