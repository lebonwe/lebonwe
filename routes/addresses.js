const { Router } = require('express');
const { db } = require('../config/db');
const { auth } = require('./customers');
const router = Router();
router.get('/', auth, (req, res) => { res.json(db.prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC').all(req.customer.id)); });
router.post('/', auth, (req, res) => {
  const { label, address, city, phone, is_default } = req.body;
  if (!address) return res.status(400).json({ error: 'Adresse requise' });
  if (is_default) db.prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?').run(req.customer.id);
  db.prepare('INSERT INTO customer_addresses (customer_id, label, address, city, phone, is_default) VALUES (?, ?, ?, ?, ?, ?)').run(req.customer.id, label || 'Domicile', address, city || 'Abidjan', phone || null, is_default ? 1 : 0);
  res.status(201).json({ message: 'Adresse ajoutée' });
});
router.delete('/:id', auth, (req, res) => { db.prepare('DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?').run(req.params.id, req.customer.id); res.json({ message: 'Adresse supprimée' }); });
module.exports = router;
