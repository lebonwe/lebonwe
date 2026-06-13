const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { code, discount_type, discount_value, min_amount, start_date, end_date, usage_limit, active } = req.body;
  if (!code || !discount_value) return res.status(400).json({ error: 'Code et valeur requis' });
  try {
    const r = db.prepare('INSERT INTO promo_codes (code, discount_type, discount_value, min_amount, start_date, end_date, usage_limit, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      code.toUpperCase(), discount_type || 'percentage', discount_value, min_amount || 0, start_date || null, end_date || null, usage_limit || 0, active !== undefined ? active : 1);
    res.status(201).json({ id: r.lastInsertRowid, message: 'Code promo créé' });
  } catch (e) {
    res.status(409).json({ error: 'Ce code existe déjà' });
  }
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM promo_codes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Code promo introuvable' });
  const { code, discount_type, discount_value, min_amount, start_date, end_date, usage_limit, active } = req.body;
  const fields = []; const vals = [];
  if (code !== undefined) { fields.push('code = ?'); vals.push(code.toUpperCase()); }
  if (discount_type !== undefined) { fields.push('discount_type = ?'); vals.push(discount_type); }
  if (discount_value !== undefined) { fields.push('discount_value = ?'); vals.push(discount_value); }
  if (min_amount !== undefined) { fields.push('min_amount = ?'); vals.push(min_amount); }
  if (start_date !== undefined) { fields.push('start_date = ?'); vals.push(start_date); }
  if (end_date !== undefined) { fields.push('end_date = ?'); vals.push(end_date); }
  if (usage_limit !== undefined) { fields.push('usage_limit = ?'); vals.push(usage_limit); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active); }
  if (fields.length) { vals.push(req.params.id); db.prepare(`UPDATE promo_codes SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  res.json({ message: 'Code promo modifié' });
});

router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM promo_codes WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Code promo introuvable' });
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Code promo supprimé' });
});

module.exports = router;
