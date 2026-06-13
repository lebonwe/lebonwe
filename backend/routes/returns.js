const { Router } = require('express');
const { db } = require('../config/db');
const { auth } = require('./customers');

const router = Router();

router.get('/', auth, (req, res) => {
  const returns = db.prepare(`SELECT r.*, p.name as product_name FROM returns r
    JOIN products p ON r.product_id = p.id WHERE r.customer_id = ? ORDER BY r.created_at DESC`).all(req.customer.id);
  res.json(returns);
});

router.post('/', auth, (req, res) => {
  const { order_id, product_id, reason } = req.body;
  if (!order_id || !product_id || !reason) return res.status(400).json({ error: 'Champs requis' });
  db.prepare('INSERT INTO returns (order_id, customer_id, product_id, reason) VALUES (?, ?, ?, ?)').run(
    order_id, req.customer.id, product_id, reason);
  res.status(201).json({ message: 'Demande de retour envoyée' });
});

router.put('/:id/resolve', (req, res) => {
  const { status, resolution } = req.body;
  db.prepare('UPDATE returns SET status = ?, resolution = ? WHERE id = ?').run(status, resolution || '', req.params.id);
  res.json({ message: 'Retour mis à jour' });
});

module.exports = router;
