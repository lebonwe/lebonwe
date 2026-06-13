const { Router } = require('express');
const { db } = require('../config/db');
const { auth } = require('./customers');

const router = Router();

router.get('/product/:productId', (req, res) => {
  const reviews = db.prepare(`SELECT r.*, c.name as customer_name
    FROM reviews r JOIN customers c ON r.customer_id = c.id
    WHERE r.product_id = ? ORDER BY r.created_at DESC`).all(req.params.productId);
  const stats = db.prepare(`SELECT COUNT(*) as count, AVG(rating) as avg
    FROM reviews WHERE product_id = ?`).get(req.params.productId);
  res.json({ reviews, stats: { count: stats.count || 0, avg: stats.avg || 0 } });
});

router.post('/product/:productId', auth, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Note entre 1 et 5' });
  try {
    db.prepare('INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES (?, ?, ?, ?)').run(
      req.params.productId, req.customer.id, rating, comment || '');
    res.status(201).json({ message: 'Avis ajouté' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Vous avez déjà donné un avis sur ce produit' });
    throw e;
  }
});

module.exports = router;
