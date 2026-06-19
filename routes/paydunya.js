const { Router } = require('express');
const { db } = require('../config/db');
const https = require('https');

const router = Router();

function getConfig() {
  const rows = db.prepare('SELECT config_key, config_value FROM site_config').all();
  const cfg = {};
  for (const r of rows) cfg[r.config_key] = r.config_value;
  return cfg;
}

function apiRequest(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'app.paydunya.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const cfg = getConfig();
    if (cfg.paydunya_master_key) opts.headers['PAYDUNYA-MASTER-KEY'] = cfg.paydunya_master_key;
    if (cfg.paydunya_private_key) opts.headers['PAYDUNYA-PRIVATE-KEY'] = cfg.paydunya_private_key;
    if (cfg.paydunya_token) opts.headers['PAYDUNYA-TOKEN'] = cfg.paydunya_token;

    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('PayDunya: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

router.post('/initiate', async (req, res) => {
  try {
    const { order_id, phone } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id requis' });

    const order = db.prepare(`
      SELECT o.*, GROUP_CONCAT(oi.product_id || ':' || oi.quantity || ':' || oi.unit_price || ':' || COALESCE(p.name,'')) as items_str
      FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.id = ? GROUP BY o.id
    `).get(order_id);
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    const cfg = getConfig();
    if (!cfg.paydunya_master_key || !cfg.paydunya_private_key || !cfg.paydunya_token) {
      return res.status(400).json({ error: 'PayDunya non configuré (clés API manquantes)' });
    }

    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : `http://localhost:${process.env.PORT || 5000}`;

    const items = [];
    if (order.items_str) {
      order.items_str.split(',').forEach(part => {
        const [pid, qty, price, name] = part.split(':');
        items.push({ name: name || 'Produit', quantity: parseInt(qty), unit_price: parseInt(price), total_price: parseInt(qty) * parseInt(price) });
      });
    }

    const invoiceData = {
      invoice: {
        total_amount: order.total,
        description: `Commande #${order.id} - ${order.customer_name}`,
        items,
        store: {
          name: cfg.site_name || 'lebonwé',
          tagline: 'High-Tech Abidjan',
          phone: cfg.contact_phone || '',
          website_url: baseUrl
        },
        actions: {
          cancel_url: `${baseUrl}/?paiement=cancel&order_id=${order.id}`,
          return_url: `${baseUrl}/?paiement=success&order_id=${order.id}`,
          callback_url: `${baseUrl}/api/paydunya/callback`
        },
        custom_data: {
          order_id: order.id,
          customer_phone: phone || order.customer_phone
        }
      }
    };

    const result = await apiRequest('/api/v1/checkout-invoice/create', invoiceData);
    if (result.response_code !== '00') {
      return res.status(502).json({ error: result.description || 'Erreur PayDunya' });
    }

    db.prepare('INSERT INTO payment_transactions (order_id, method, amount, phone, transaction_id, status) VALUES (?, ?, ?, ?, ?, ?)').run(
      order_id, 'paydunya', order.total, phone || order.customer_phone, result.token, 'pending');

    db.prepare('UPDATE orders SET payment_token = ? WHERE id = ?').run(result.token, order.id);

    res.json({ checkout_url: result.response_text, token: result.token });
  } catch (e) {
    res.status(502).json({ error: 'Erreur PayDunya: ' + e.message });
  }
});

async function handleCallback(token) {
  if (!token) return { error: 'token requis' };
  const result = await apiRequest('/api/v1/checkout-invoice/confirm', { token });
  const tx = db.prepare('SELECT * FROM payment_transactions WHERE transaction_id = ?').get(token);
  if (!tx) return { error: 'Transaction introuvable' };
  if (result.status === 'completed' || result.response_code === '00') {
    db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run('completed', tx.id);
    db.prepare('UPDATE orders SET status = ?, payment_method = ? WHERE id = ?').run('confirmed', 'paydunya', tx.order_id);
  } else {
    db.prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run('failed', tx.id);
  }
  return { status: 'ok' };
}

router.all('/callback', async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token || req.body?.data?.token;
    if (!token) return res.status(400).json({ error: 'token requis' });
    const r = await handleCallback(token);
    if (r.error) return res.status(404).json(r);
    res.json(r);
  } catch (e) {
    res.status(502).json({ error: 'Erreur callback PayDunya: ' + e.message });
  }
});

router.get('/confirm/:token', async (req, res) => {
  try {
    const result = await apiRequest('/api/v1/checkout-invoice/confirm', { token: req.params.token });
    const tx = db.prepare('SELECT * FROM payment_transactions WHERE transaction_id = ?').get(req.params.token);
    res.json({
      paydunya_status: result.status || result.response_text,
      transaction: tx ? { id: tx.id, order_id: tx.order_id, amount: tx.amount, status: tx.status } : null
    });
  } catch (e) {
    res.status(502).json({ error: 'Erreur confirmation PayDunya: ' + e.message });
  }
});

module.exports = router;
