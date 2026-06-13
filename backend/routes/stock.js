const { Router } = require('express');
const { db } = require('../config/db');
const router = Router();
router.get('/product/:productId', (req, res) => { res.json(db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(req.params.productId)); });
router.post('/product/:productId', (req, res) => {
  const { name, value, price_modifier, stock, sku } = req.body;
  if (!name || !value) return res.status(400).json({ error: 'Nom et valeur requis' });
  db.prepare('INSERT INTO product_variants (product_id, name, value, price_modifier, stock, sku) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.productId, name, value, price_modifier || 0, stock || 0, sku || null);
  res.status(201).json({ message: 'Variante ajoutée' });
});
router.delete('/:id', (req, res) => { db.prepare('DELETE FROM product_variants WHERE id = ?').run(req.params.id); res.json({ message: 'Supprimée' }); });
router.get('/movements/:productId', (req, res) => { res.json(db.prepare('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.productId)); });
router.post('/movements/:productId', (req, res) => {
  const { quantity, type, reference, note } = req.body;
  if (!quantity || !type) return res.status(400).json({ error: 'Quantité et type requis' });
  db.prepare('INSERT INTO stock_movements (product_id, quantity, type, reference, note) VALUES (?, ?, ?, ?, ?)').run(req.params.productId, quantity, type, reference || null, note || null);
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, req.params.productId);
  res.json({ message: 'Mouvement enregistré' });
});
module.exports = router;
