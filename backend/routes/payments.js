const { Router } = require('express');
const { db } = require('../config/db');
const crypto = require('crypto');

const router = Router();

const METHODS = ['orange_money', 'mtn_money', 'wave', 'visa'];
const METHOD_LABELS = { orange_money: 'Orange Money', mtn_money: 'MTN Money', wave: 'Wave', visa: 'Visa' };

router.post('/initiate', (req, res) => {
  const { order_id, method, phone } = req.body;
  if (!order_id || !method) return res.status(400).json({ error: 'order_id et method requis' });
  if (!METHODS.includes(method)) return res.status(400).json({ error: 'Méthode invalide' });
  const order = db.prepare('SELECT id, total, status FROM orders WHERE id = ?').get(order_id);
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  const txId = 'TX' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare('INSERT INTO payment_transactions (order_id, method, amount, phone, transaction_id, status) VALUES (?, ?, ?, ?, ?, ?)').run(
    order_id, method, order.total, phone || null, txId, 'pending');
  res.json({ transaction_id: txId, message: `Paiement ${METHOD_LABELS[method]} initié` });
});

router.post('/confirm/:txId', (req, res) => {
  const tx = db.prepare('SELECT * FROM payment_transactions WHERE transaction_id = ?').get(req.params.txId);
  if (!tx) return res.status(404).json({ error: 'Transaction introuvable' });
  db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run('completed', tx.id);
  db.prepare('UPDATE orders SET status = ?, payment_method = ? WHERE id = ?').run('confirmed', tx.method, tx.order_id);
  res.json({ message: 'Paiement confirmé' });
});

router.get('/methods', (req, res) => {
  const methods = db.prepare("SELECT config_value FROM site_config WHERE config_key = 'payment_methods'").get();
  const list = (methods?.config_value || 'Orange Money,MTN Money,Wave,Visa').split(',').map(m => ({
    id: m.trim().toLowerCase().replace(/\s+/g, '_'), label: m.trim()
  }));
  res.json(list);
});

module.exports = router;
