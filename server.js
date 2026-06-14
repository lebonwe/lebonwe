require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { init, db } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/admin/auth', require('./routes/admin-auth'));
app.use('/api/admin/customers', require('./routes/customers-admin'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/export', require('./routes/export'));
app.use('/api/config', require('./routes/config'));
app.use('/api/promos', require('./routes/promos'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/flash-sales', require('./routes/flash-sales'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/addresses', require('./routes/addresses'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/newsletter-segments', require('./routes/newsletter-segments'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/notify', require('./routes/notify'));
app.use('/api/import', require('./routes/import'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const frontendPath = __dirname;
app.use(express.static(frontendPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (!req.path.includes('.')) return res.sendFile(path.join(frontendPath, 'index.html'));
  next();
});

app.use(errorHandler);

init().then(() => {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count === 0) {
    console.log('Base vide -> auto-seed en cours...');
    require('./seeder');
  }
  app.listen(PORT, () => {
    console.log(`Serveur lebonwe demarre sur http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
  });
});
