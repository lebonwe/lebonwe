const { Router } = require('express');
const { db } = require('../config/db');
const { auth } = require('./customers');

const router = Router();

router.get('/', auth, (req, res) => {
  const notifs = db.prepare('SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50').all(req.customer.id);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE customer_id = ? AND read = 0').get(req.customer.id);
  res.json({ notifs, unread: unread?.c || 0 });
});

router.put('/read/:id', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND customer_id = ?').run(req.params.id, req.customer.id);
  res.json({ message: 'Marqué comme lu' });
});

router.put('/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE customer_id = ?').run(req.customer.id);
  res.json({ message: 'Tout marqué comme lu' });
});

module.exports = router;
