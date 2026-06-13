const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

function toCsv(rows, cols) {
  const header = cols.join(',') + '\n';
  const body = rows.map(r => cols.map(c => {
    const v = r[c];
    if (v === null || v === undefined) return '';
    return '"' + String(v).replace(/"/g, '""') + '"';
  }).join(',')).join('\n');
  return header + body;
}

router.get('/products', (req, res) => {
  const data = db.prepare(`SELECT p.id, p.name, p.price, p.old_price, p.discount, p.stock, p.condition, p.description,
    COALESCE(c.name, '') as category FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id`).all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=produits.csv');
  res.send(toCsv(data, ['id', 'name', 'price', 'old_price', 'discount', 'stock', 'condition', 'category', 'description']));
});

router.get('/orders', (req, res) => {
  const data = db.prepare(`SELECT id, customer_name, customer_phone, customer_email, total, status, payment_method, created_at FROM orders ORDER BY id`).all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=commandes.csv');
  res.send(toCsv(data, ['id', 'customer_name', 'customer_phone', 'customer_email', 'total', 'status', 'payment_method', 'created_at']));
});

router.get('/subscribers', (req, res) => {
  const data = db.prepare('SELECT email, created_at FROM subscribers ORDER BY created_at DESC').all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=abonnes.csv');
  res.send(toCsv(data, ['email', 'created_at']));
});

module.exports = router;
