const { Router } = require('express');
const { db } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({ dest: path.resolve(__dirname, '..', 'data', 'uploads') });
const router = Router();

router.post('/products', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
  const csv = fs.readFileSync(req.file.path, 'utf8');
  const lines = csv.split('\n').filter(l => l.trim());
  if (lines.length < 2) return res.status(400).json({ error: 'CSV vide ou invalide' });
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const imported = []; let errors = 0;
  for (let i = 1; i < lines.length; i++) {
    try {
      const vals = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => row[h] = vals[idx] || '');
      if (!row.name) { errors++; continue; }
      const slug = row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const category = row.category ? db.prepare('SELECT id FROM categories WHERE name = ? OR slug = ?').get(row.category, row.category) : null;
      db.prepare(`INSERT INTO products (name, slug, description, price, old_price, image, condition, stock, category_id, discount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        row.name, slug, row.description || '', parseInt(row.price) || 0, parseInt(row.old_price) || null,
        row.image || null, row.condition || 'neuf', parseInt(row.stock) || 0, category?.id || null, parseInt(row.discount) || 0);
      imported.push(row.name);
    } catch (e) { errors++; }
  }
  fs.unlinkSync(req.file.path);
  res.json({ message: `${imported.length} produits importés`, errors, imported });
});

module.exports = router;
