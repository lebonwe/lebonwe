const { Router } = require('express');
const { db } = require('../config/db');

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT config_key, config_value FROM site_config').all();
  const config = {};
  for (const r of rows) config[r.config_key] = r.config_value;
  res.json(config);
});

router.put('/', (req, res) => {
  const allowed = ['site_name', 'contact_email', 'contact_phone', 'address', 'facebook', 'twitter', 'instagram', 'payment_methods', 'delivery_fee', 'currency', 'google_client_id', 'paydunya_master_key', 'paydunya_private_key', 'paydunya_token'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      db.prepare('INSERT OR REPLACE INTO site_config (config_key, config_value) VALUES (?, ?)').run(key, String(req.body[key]));
    }
  }
  const rows = db.prepare('SELECT config_key, config_value FROM site_config').all();
  const config = {};
  for (const r of rows) config[r.config_key] = r.config_value;
  res.json(config);
});

module.exports = router;
