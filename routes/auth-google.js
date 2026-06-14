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

const GOOGLE_TOKEN_INFO = 'https://oauth2.googleapis.com/tokeninfo?id_token=';

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google requis' });

  try {
    const r = await fetch(GOOGLE_TOKEN_INFO + credential);
    const data = await r.json();
    if (!r.ok || !data.email) return res.status(401).json({ error: 'Token Google invalide' });

    const { email, name, sub } = data;

    const disposableDomains = new Set(require('disposable-email-domains'));
    const domain = email.split('@')[1];
    if (domain && disposableDomains.has(domain.toLowerCase())) {
      return res.status(400).json({ error: 'Les emails jetables ne sont pas autorisés' });
    }

    let customer = db.prepare('SELECT id, name, email, phone FROM customers WHERE email = ?').get(email);

    if (!customer) {
      const code = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)
        + Math.random().toString(36).slice(2, 6);
      const pwd = hash('google_' + sub + '_' + Date.now());
      const r2 = db.prepare('INSERT INTO customers (name, email, password, auth_token, referral_code) VALUES (?, ?, ?, ?, ?)').run(
        name || email.split('@')[0], email, pwd, token(), code);
      customer = { id: r2.lastInsertRowid, name: name || email.split('@')[0], email, phone: null };
    } else {
      const t = token();
      db.prepare('UPDATE customers SET auth_token = ? WHERE id = ?').run(t, customer.id);
      customer.auth_token = t;
    }

    const final = db.prepare('SELECT id, name, email, phone FROM customers WHERE id = ?').get(customer.id);
    const t = db.prepare('SELECT auth_token FROM customers WHERE id = ?').get(customer.id);
    res.json({ token: t.auth_token, customer: final });
  } catch (e) {
    res.status(500).json({ error: 'Erreur vérification Google: ' + e.message });
  }
});

module.exports = router;
