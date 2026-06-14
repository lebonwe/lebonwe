const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const sales = db.prepare(`SELECT fs.*, p.name, p.price, p.image, p.stock,
    (fs.discount_percent) as discount FROM flash_sales fs
    JOIN products p ON fs.product_id = p.id
    WHERE fs.active = 1 AND fs.start_date <= ? AND fs.end_date >= ?
    ORDER BY fs.end_date ASC`).all(now, now);
  res.json(sales.map(s => ({
    ...s, flash_price: Math.round(s.price * (100 - s.discount) / 100)
  })));
});

router.post('/', (req, res) => {
  const { product_id, discount_percent, start_date, end_date, max_quantity } = req.body;
  if (!product_id || !discount_percent || !start_date || !end_date) return res.status(400).json({ error: 'Champs requis' });
  db.prepare('INSERT INTO flash_sales (product_id, discount_percent, start_date, end_date, max_quantity) VALUES (?, ?, ?, ?, ?)').run(
    product_id, discount_percent, start_date, end_date, max_quantity || 0);
  res.status(201).json({ message: 'Flash sale créée' });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM flash_sales WHERE id = ?').run(req.params.id);
  res.json({ message: 'Supprimée' });
});

module.exports = router;
