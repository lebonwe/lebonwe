const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

function session(req) { return req.headers['x-session-id'] || 'anon'; }

router.get('/', (req, res) => {
  const sid = session(req);
  const items = db.prepare(`SELECT ci.*, p.name, p.price, p.old_price, p.image, p.stock
    FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.session_id = ?`).all(sid);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ items, total, count: items.reduce((c, i) => c + i.quantity, 0) });
});

router.post('/add', (req, res) => {
  const sid = session(req);
  const { product_id, quantity = 1 } = req.body;
  if (!product_id) return res.status(400).json({ error: 'product_id requis' });

  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });

  const existing = db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND product_id = ?').get(sid, product_id);
  const currentQty = existing ? existing.quantity : 0;
  const newQty = existing ? currentQty + quantity : quantity;

  if (newQty > product.stock) return res.status(400).json({ error: 'Stock insuffisant (max ' + product.stock + ')' });

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE session_id = ? AND product_id = ?').run(newQty, sid, product_id);
  } else {
    db.prepare('INSERT INTO cart_items (session_id, product_id, quantity) VALUES (?, ?, ?)').run(sid, product_id, quantity);
  }
  res.json({ message: 'Ajouté au panier' });
});

router.patch('/:id', (req, res) => {
  const sid = session(req);
  const qty = req.body.quantity;
  if (qty < 1) {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(req.params.id, sid);
  } else {
    const item = db.prepare('SELECT ci.*, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.id = ? AND ci.session_id = ?').get(req.params.id, sid);
    if (item && qty > item.stock) return res.status(400).json({ error: 'Stock insuffisant (max ' + item.stock + ')' });
      db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND session_id = ?').run(qty, req.params.id, sid);
    }
    res.json({ message: 'Panier mis à jour' });
  });

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ? AND session_id = ?').run(req.params.id, session(req));
  res.json({ message: 'Article retiré' });
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(session(req));
  res.json({ message: 'Panier vidé' });
});

module.exports = router;
