const { Router } = require('express');
const crypto = require('crypto');
const { db } = require('../config/db');

const router = Router();

function hash(pwd) {
  return crypto.createHash('sha256').update(pwd + 'lebonwe_salt_2026').digest('hex');
}

function token() {
  return crypto.randomBytes(32).toString('hex');
}

function auth(req, res, next) {
  const t = req.headers['x-auth-token'];
  if (!t) return res.status(401).json({ error: 'Authentification requise' });
  const c = db.prepare('SELECT id, name, email, phone, address, city, created_at FROM customers WHERE auth_token = ?').get(t);
  if (!c) return res.status(401).json({ error: 'Token invalide' });
  req.customer = c;
  next();
}

router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });
  if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins une majuscule' });
  if (!/[a-z]/.test(password)) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins une minuscule' });
  if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins un chiffre' });
  if (!/[^a-zA-Z0-9]/.test(password)) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins un symbole spécial' });
  const existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  const t = token();
  const code = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) + Math.random().toString(36).slice(2, 6);
  const r = db.prepare('INSERT INTO customers (name, email, phone, password, auth_token, referral_code) VALUES (?, ?, ?, ?, ?, ?)').run(
    name, email, phone || null, hash(password), t, code);
  res.status(201).json({ token: t, customer: { id: r.lastInsertRowid, name, email, phone: phone || null, referral_code: code } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  const c = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
  if (!c || c.password !== hash(password)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  const t = token();
  db.prepare('UPDATE customers SET auth_token = ? WHERE id = ?').run(t, c.id);
  res.json({ token: t, customer: { id: c.id, name: c.name, email: c.email, phone: c.phone } });
});

router.get('/me', auth, (req, res) => {
  const c = db.prepare('SELECT id, name, email, phone, address, city, loyalty_points, referral_code, created_at FROM customers WHERE id = ?').get(req.customer.id);
  res.json(c);
});

router.put('/me', auth, (req, res) => {
  const { name, phone, address, city } = req.body;
  const fields = []; const vals = [];
  if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
  if (phone !== undefined) { fields.push('phone = ?'); vals.push(phone); }
  if (address !== undefined) { fields.push('address = ?'); vals.push(address); }
  if (city !== undefined) { fields.push('city = ?'); vals.push(city); }
  if (fields.length) { vals.push(req.customer.id); db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  const updated = db.prepare('SELECT id, name, email, phone, address, city, created_at FROM customers WHERE id = ?').get(req.customer.id);
  res.json(updated);
});

router.get('/orders', auth, (req, res) => {
  const rows = db.prepare(`SELECT o.* FROM customer_orders co
    JOIN orders o ON co.order_id = o.id WHERE co.customer_id = ? ORDER BY o.created_at DESC`).all(req.customer.id);
  for (const o of rows) {
    o.items = db.prepare(`SELECT oi.*, p.name as product_name, p.image
      FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`).all(o.id);
  }
  res.json(rows);
});

router.post('/orders', auth, (req, res) => {
  const { address, city, notes, items, payment_method } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Aucun article' });
  const customer = req.customer;
  for (const item of items) {
    const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(item.product_id);
    if (!p) return res.status(400).json({ error: 'Produit #' + item.product_id + ' introuvable' });
    if (p.stock < item.quantity) return res.status(400).json({ error: 'Stock insuffisant pour le produit #' + item.product_id + ' (dispo: ' + p.stock + ')' });
  }
  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const r = db.prepare(`INSERT INTO orders (customer_name, customer_phone, customer_email, address, city, notes, total, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    customer.name, customer.phone || '', customer.email, address || customer.address || null,
    city || 'Abidjan', notes || null, total, payment_method || 'mobile_money');
  const ins = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
  for (const item of items) {
    ins.run(r.lastInsertRowid, item.product_id, item.quantity, item.unit_price);
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  db.prepare('INSERT INTO customer_orders (customer_id, order_id) VALUES (?, ?)').run(customer.id, r.lastInsertRowid);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(r.lastInsertRowid);
  order.items = db.prepare(`SELECT oi.*, p.name as product_name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`).all(r.lastInsertRowid);
  res.status(201).json(order);
});

module.exports = router;
module.exports.auth = auth;
