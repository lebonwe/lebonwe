const { Router } = require('express');
const { db } = require('../config/db');
const crypto = require('crypto');

const router = Router();

function genReferralCode(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return base + crypto.randomBytes(2).toString('hex');
}

router.get('/points', (req, res) => {
  const t = req.headers['x-auth-token'];
  if (!t) return res.status(401).json({ error: 'Auth requise' });
  const c = db.prepare('SELECT id, loyalty_points, referral_code FROM customers WHERE auth_token = ?').get(t);
  if (!c) return res.status(401).json({ error: 'Token invalide' });
  const log = db.prepare('SELECT * FROM loyalty_points_log WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20').all(c.id);
  res.json({ points: c.loyalty_points || 0, referral_code: c.referral_code, log });
});

router.post('/use-points', (req, res) => {
  const t = req.headers['x-auth-token'];
  if (!t) return res.status(401).json({ error: 'Auth requise' });
  const c = db.prepare('SELECT id, loyalty_points FROM customers WHERE auth_token = ?').get(t);
  if (!c) return res.status(401).json({ error: 'Token invalide' });
  const { points, order_id } = req.body;
  if (!points || points < 0) return res.status(400).json({ error: 'Points invalides' });
  if ((c.loyalty_points || 0) < points) return res.status(400).json({ error: 'Points insuffisants' });
  db.prepare('UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?').run(points, c.id);
  db.prepare('INSERT INTO loyalty_points_log (customer_id, points, reason, order_id) VALUES (?, ?, ?, ?)').run(c.id, -points, 'Utilisation sur commande', order_id || null);
  if (order_id) db.prepare('UPDATE orders SET points_used = ? WHERE id = ?').run(points, order_id);
  res.json({ message: `${points} points utilisés`, remaining: (c.loyalty_points || 0) - points });
});

router.post('/apply-referral', (req, res) => {
  const t = req.headers['x-auth-token'];
  if (!t) return res.status(401).json({ error: 'Auth requise' });
  const c = db.prepare('SELECT id, referral_code FROM customers WHERE auth_token = ?').get(t);
  if (!c) return res.status(401).json({ error: 'Token invalide' });
  if (c.referral_code) return res.json({ referral_code: c.referral_code });
  const code = genReferralCode(c.name || 'user');
  db.prepare('UPDATE customers SET referral_code = ? WHERE id = ?').run(code, c.id);
  res.json({ referral_code: code });
});

router.post('/register-referral', (req, res) => {
  const { code } = req.body;
  const referrer = db.prepare('SELECT id FROM customers WHERE referral_code = ?').get(code);
  if (!referrer) return res.status(404).json({ error: 'Code parrainage invalide' });
  db.prepare('UPDATE customers SET referred_by = ? WHERE auth_token = ?').run(code, req.headers['x-auth-token']);
  db.prepare('UPDATE customers SET loyalty_points = loyalty_points + 100 WHERE id = ?').run(referrer.id);
  db.prepare('INSERT INTO loyalty_points_log (customer_id, points, reason) VALUES (?, ?, ?)').run(referrer.id, 100, 'Parrainage');
  res.json({ message: 'Code parrainage appliqué ! 100 points offerts au parrain' });
});

module.exports = router;
