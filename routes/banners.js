const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC').all();
  if (!banners.length) {
    res.json([
      { id: 0, name: 'Default', title: 'iPhone 14 Pro Max', subtitle: 'À partir de 450 000 F', image: 'https://images.unsplash.com/photo-1695048133142-1a2e7c2f2b8f?w=800&q=80', link: '#', active: 1, sort_order: 0 },
      { id: 0, name: 'Default 2', title: 'AirPods Pro 2', subtitle: 'Son exceptionnel à 99 000 F', image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b4e3?w=800&q=80', link: '#', active: 1, sort_order: 1 }
    ]);
    return;
  }
  res.json(banners);
});

router.post('/', (req, res) => {
  const { name, title, subtitle, image, link, active, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const r = db.prepare('INSERT INTO banners (name, title, subtitle, image, link, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    name, title || null, subtitle || null, image || null, link || null, active !== undefined ? active : 1, sort_order || 0);
  res.status(201).json({ id: r.lastInsertRowid, message: 'Bannière créée' });
});

router.put('/:id', (req, res) => {
  const { name, title, subtitle, image, link, active, sort_order } = req.body;
  const existing = db.prepare('SELECT id FROM banners WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Bannière introuvable' });
  const fields = []; const vals = [];
  if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
  if (title !== undefined) { fields.push('title = ?'); vals.push(title); }
  if (subtitle !== undefined) { fields.push('subtitle = ?'); vals.push(subtitle); }
  if (image !== undefined) { fields.push('image = ?'); vals.push(image); }
  if (link !== undefined) { fields.push('link = ?'); vals.push(link); }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); vals.push(sort_order); }
  if (fields.length) { vals.push(req.params.id); db.prepare(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  res.json({ message: 'Bannière modifiée' });
});

router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM banners WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Bannière introuvable' });
  db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  res.json({ message: 'Bannière supprimée' });
});

module.exports = router;
