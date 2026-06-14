const { Router } = require('express');
const { db } = require('../config/db');
const { auth } = require('./customers');
const router = Router();
router.get('/', auth, (req, res) => { res.json(db.prepare('SELECT * FROM recurring_orders WHERE customer_id = ? AND active = 1').all(req.customer.id)); });
router.post('/', auth, (req, res) => {
  const { product_id, quantity, frequency } = req.body;
  if (!product_id || !frequency) return res.status(400).json({ error: 'Produit et fréquence requis' });
  const next = new Date(); next.setDate(next.getDate() + (frequency === 'weekly' ? 7 : frequency === 'monthly' ? 30 : 90));
  db.prepare('INSERT INTO recurring_orders (customer_id, product_id, quantity, frequency, next_date) VALUES (?, ?, ?, ?, ?)').run(req.customer.id, product_id, quantity || 1, frequency, next.toISOString().slice(0, 10));
  res.status(201).json({ message: 'Abonnement créé' });
});
router.delete('/:id', auth, (req, res) => { db.prepare('UPDATE recurring_orders SET active = 0 WHERE id = ? AND customer_id = ?').run(req.params.id, req.customer.id); res.json({ message: 'Abonnement arrêté' }); });
module.exports = router;
