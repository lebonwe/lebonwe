const { Router } = require('express');
const Order = require('../models/Order');

const router = Router();

router.get('/', (req, res) => {
  res.json(Order.getAll());
});

router.get('/:id', (req, res) => {
  const order = Order.getById(parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(order);
});

router.post('/', (req, res) => {
  const { customer_name, customer_phone, items } = req.body;
  if (!customer_name || !customer_phone || !items || !items.length) {
    return res.status(400).json({ error: 'Nom, téléphone et articles requis' });
  }
  // Check stock
  const { db } = require('../config/db');
  for (const item of items) {
    const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    if (!p) return res.status(400).json({ error: 'Produit #' + item.product_id + ' introuvable' });
    if (p.stock < item.quantity) return res.status(400).json({ error: 'Stock insuffisant pour le produit #' + item.product_id + ' (dispo: ' + p.stock + ')' });
  }
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const order = Order.create({ ...req.body, total });
  // Deduct stock
  for (const item of items) {
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  res.status(201).json(order);
});

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
  const id = parseInt(req.params.id);
  if (!Order.getById(id)) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(Order.updateStatus(id, status));
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Order.getById(id)) return res.status(404).json({ error: 'Commande introuvable' });
  const { db } = require('../config/db');
  db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);
  db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  res.json({ message: 'Commande supprimée' });
});

module.exports = router;
