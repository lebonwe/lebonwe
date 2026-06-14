require('dotenv').config();
const { init, db } = require('./config/db');

(async () => {
  await init();

  const categories = [
    { name: 'Téléphones', slug: 'telephones', icon: 'fa-mobile-alt', color: '#fff3e0' },
    { name: 'Ordinateurs Portables', slug: 'ordinateurs-portables', icon: 'fa-laptop', color: '#e8f5e9' },
    { name: 'Ordinateurs Bureau', slug: 'ordinateurs-bureau', icon: 'fa-desktop', color: '#e3f2fd' },
    { name: 'Consoles', slug: 'consoles', icon: 'fa-gamepad', color: '#fce4ec' },
    { name: 'Accessoires', slug: 'accessoires', icon: 'fa-headphones', color: '#f3e5f5' },
  ];

  const catStmt = db.prepare('INSERT OR IGNORE INTO categories (name, slug, icon, color) VALUES (?, ?, ?, ?)');
  for (const c of categories) catStmt.run(c.name, c.slug, c.icon, c.color);

  const products = [
    ['iPhone 14 Pro Max 256GB', 'iphone-14-pro-max-256gb', 750000, 850000, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80', 'neuf', 5, 1, 1, 12],
    ['MacBook Pro M3 16" 512GB', 'macbook-pro-m3-16-512gb', 1200000, 1400000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80', 'neuf', 3, 2, 1, 15],
    ['PlayStation 4 Slim 1TB', 'ps4-slim-1tb', 150000, 200000, 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=80', 'occasion', 8, 4, 1, 25],
    ['Samsung Galaxy S24 Ultra', 'samsung-galaxy-s24-ultra', 650000, null, 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=400&q=80', 'neuf', 4, 1, 1, 0],
    ['PlayStation 6 Digital Edition', 'ps6-digital-edition', 450000, 560000, 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=400&q=80', 'neuf', 2, 4, 1, 20],
    ['Dell XPS 15 OLED i7 32GB', 'dell-xps-15-oled-i7-32gb', 500000, null, 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&q=80', 'occasion', 1, 2, 1, 0],
    ['AirPods Pro 2', 'airpods-pro-2', 85000, 100000, 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=400&q=80', 'neuf', 15, 5, 0, 15],
    ['PS3 Slim 320GB', 'ps3-slim-320gb', 65000, 90000, 'https://images.unsplash.com/photo-1539575462844-03c0b1e140d1?w=400&q=80', 'occasion', 6, 4, 0, 0],
    ['iMac 27" M3 24GB', 'imac-27-m3-24gb', 1800000, null, 'https://images.unsplash.com/photo-1527443060793-9d9a2b50f54d?w=400&q=80', 'neuf', 2, 3, 1, 0],
    ['Nintendo Switch OLED', 'nintendo-switch-oled', 200000, null, 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&q=80', 'neuf', 7, 4, 0, 0],
  ];

  const prodStmt = db.prepare(`INSERT OR IGNORE INTO products (name, slug, price, old_price, image, condition, stock, category_id, featured, discount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of products) prodStmt.run(...p);

  console.log('Base de donnees initialisee avec succes !');
  console.log(`  ${categories.length} categories, ${products.length} produits`);
  process.exit(0);
})();
