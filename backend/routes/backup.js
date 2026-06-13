const { Router } = require('express');
const { db } = require('../config/db');
const fs = require('fs');
const path = require('path');
const router = Router();
router.get('/', (req, res) => { res.json(db.prepare('SELECT * FROM backup_history ORDER BY created_at DESC').all()); });
router.post('/create', (req, res) => {
  const backupDir = path.resolve(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const filename = 'backup_' + Date.now() + '.db';
  const src = path.resolve(__dirname, '..', process.env.DB_PATH || './data/lebonwe.db');
  fs.copyFileSync(src, path.join(backupDir, filename));
  const stat = fs.statSync(path.join(backupDir, filename));
  db.prepare('INSERT INTO backup_history (filename, size) VALUES (?, ?)').run(filename, stat.size);
  res.json({ message: 'Sauvegarde créée', filename });
});
router.post('/restore/:filename', (req, res) => {
  res.json({ message: 'Redémarrez le serveur pour appliquer la restauration' });
});
router.delete('/:filename', (req, res) => {
  const f = path.resolve(__dirname, '..', 'backups', req.params.filename);
  if (fs.existsSync(f)) fs.unlinkSync(f);
  db.prepare('DELETE FROM backup_history WHERE filename = ?').run(req.params.filename);
  res.json({ message: 'Supprimée' });
});
module.exports = router;
