const { Router } = require('express');
const crypto = require('crypto');
const { db } = require('../config/db');

const router = Router();

function hash(pwd) {
  return crypto.createHash('sha256').update(pwd + 'lebonwe_salt_2026').digest('hex');
}

const VALID_ROLES = ['super_admin', 'manager', 'commercial', 'vendeur'];
const ROLE_LABELS = { super_admin: 'Super Admin', manager: 'Manager', commercial: 'Commercial', vendeur: 'Vendeur' };

function auth(req, res, next) {
  const t = req.headers['x-admin-token'];
  if (!t) return res.status(401).json({ error: 'Authentification admin requise' });
  const user = db.prepare('SELECT id, name, email, role, active FROM admin_users WHERE auth_token = ?').get(t);
  if (!user) return res.status(401).json({ error: 'Token invalide' });
  if (!user.active) return res.status(403).json({ error: 'Compte désactivé' });
  req.admin = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Non authentifié' });
    if (!roles.includes(req.admin.role) && req.admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Accès refusé pour ce rôle' });
    }
    next();
  };
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);
  if (!user || user.password !== hash(password)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  if (!user.active) return res.status(403).json({ error: 'Compte désactivé' });
  const t = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE admin_users SET auth_token = ? WHERE id = ?').run(t, user.id);
  res.json({ token: t, user: { id: user.id, name: user.name, email: user.email, role: user.role, role_label: ROLE_LABELS[user.role] } });
});

router.get('/me', auth, (req, res) => {
  res.json({ ...req.admin, role_label: ROLE_LABELS[req.admin.role] });
});

router.post('/logout', auth, (req, res) => {
  db.prepare('UPDATE admin_users SET auth_token = NULL WHERE id = ?').run(req.admin.id);
  res.json({ message: 'Déconnecté' });
});

// Super admin only: user management
router.get('/users', auth, requireRole('super_admin'), (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, active, created_at FROM admin_users ORDER BY created_at ASC').all();
  res.json(users);
});

router.post('/users', auth, requireRole('super_admin'), (req, res) => {
  const { name, email, password, role, active } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide: ' + VALID_ROLES.join(', ') });
  const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  const r = db.prepare('INSERT INTO admin_users (name, email, password, role, active) VALUES (?, ?, ?, ?, ?)').run(
    name, email, hash(password), role, active !== undefined ? active : 1);
  res.status(201).json({ id: r.lastInsertRowid, message: 'Utilisateur créé' });
});

router.put('/users/:id', auth, requireRole('super_admin'), (req, res) => {
  const { name, email, password, role, active } = req.body;
  const existing = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const fields = []; const vals = [];
  if (name !== undefined) { fields.push('name = ?'); vals.push(name); }
  if (email !== undefined) { fields.push('email = ?'); vals.push(email); }
  if (password !== undefined) { fields.push('password = ?'); vals.push(hash(password)); }
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
    fields.push('role = ?'); vals.push(role);
  }
  if (active !== undefined) { fields.push('active = ?'); vals.push(active); }
  if (fields.length) { vals.push(req.params.id); db.prepare(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`).run(...vals); }
  res.json({ message: 'Utilisateur modifié' });
});

router.delete('/users/:id', auth, requireRole('super_admin'), (req, res) => {
  if (parseInt(req.params.id) === req.admin.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous supprimer vous-même' });
  if (!db.prepare('SELECT id FROM admin_users WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: 'Utilisateur introuvable' });
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(req.params.id);
  res.json({ message: 'Utilisateur supprimé' });
});

module.exports = router;
