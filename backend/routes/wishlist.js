const { Router } = require('express');
const { db } = require('../config/db');
const { auth } = require('./customers');

const router = Router();

router.get('/', auth, (req, res) => {
  const items = db.prepare(`SELECT w.*, p.name, p.price, p.image, p.stock
    FROM wishlist w JOIN products p ON w.product_id = p.id
    WHERE w.customer_id = ? ORDER BY w.created_at DESC`).all(req.customer.id);
  res.json(items);
});

router.post('/', auth, (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id requis' });
  try {
    db.prepare('INSERT INTO wishlist (customer_id, product_id) VALUES (?, ?)').run(req.customer.id, product_id);
    res.status(201).json({ message: 'Ajouté aux favoris' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Déjà dans vos favoris' });
    throw e;
  }
});

router.delete('/:productId', auth, (req, res) => {
  db.prepare('DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?').run(req.customer.id, req.params.productId);
  res.json({ message: 'Retiré des favoris' });
});

router.get('/check/:productId', auth, (req, res) => {
  const item = db.prepare('SELECT id FROM wishlist WHERE customer_id = ? AND product_id = ?').get(req.customer.id, req.params.productId);
  res.json({ favorited: !!item });
});

module.exports = router;
