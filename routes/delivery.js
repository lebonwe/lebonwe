const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

const DELIVERY_STATUSES = ['pending', 'preparing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];
const STATUS_LABELS = {
  pending: 'En attente', preparing: 'En préparation', shipped: 'Expédié',
  in_transit: 'En transit', out_for_delivery: 'En livraison',
  delivered: 'Livré', failed: 'Échec'
};

router.get('/status/:orderId', (req, res) => {
  const order = db.prepare('SELECT id, delivery_status, delivery_tracking, delivery_notes FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const timeline = db.prepare('SELECT * FROM delivery_tracking WHERE order_id = ? ORDER BY created_at ASC').all(req.params.orderId);
  res.json({ ...order, status_label: STATUS_LABELS[order.delivery_status] || order.delivery_status, timeline });
});

router.put('/status/:orderId', (req, res) => {
  const { status, note } = req.body;
  if (!DELIVERY_STATUSES.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  db.prepare('UPDATE orders SET delivery_status = ? WHERE id = ?').run(status, req.params.orderId);
  db.prepare('INSERT INTO delivery_tracking (order_id, status, note) VALUES (?, ?, ?)').run(req.params.orderId, status, note || STATUS_LABELS[status]);
  res.json({ message: 'Statut mis à jour', status, label: STATUS_LABELS[status] });
});

module.exports = router;
