const { Router } = require('express');
const { db } = require('../config/db');
const router = Router();
router.get('/', (req, res) => { res.json(db.prepare('SELECT * FROM newsletter_segments').all()); });
router.post('/', (req, res) => {
  const { name, filter_categories } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  db.prepare('INSERT INTO newsletter_segments (name, filter_categories) VALUES (?, ?)').run(name, filter_categories || null);
  res.status(201).json({ message: 'Segment créé' });
});
router.put('/:id', (req, res) => {
  const { name, filter_categories } = req.body;
  db.prepare('UPDATE newsletter_segments SET name = ?, filter_categories = ? WHERE id = ?').run(name, filter_categories, req.params.id);
  res.json({ message: 'Modifié' });
});
router.delete('/:id', (req, res) => { db.prepare('DELETE FROM newsletter_segments WHERE id = ?').run(req.params.id); res.json({ message: 'Supprimé' }); });
module.exports = router;
