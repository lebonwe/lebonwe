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
    // ---- Temu / AliExpress / Shein style ----
    ['Montre Connectée Smart Watch Pro 2026', 'montre-connectee-smart-watch-pro', 25000, 45000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', 'neuf', 30, 5, 0, 45],
    ['Écouteurs Bluetooth TWS Sans Fil', 'ecouteurs-bluetooth-tws', 12000, 25000, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f0f?w=400&q=80', 'neuf', 50, 5, 0, 52],
    ['Enceinte Bluetooth Portable XXL', 'enceinte-bluetooth-portable', 18000, 35000, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80', 'neuf', 20, 5, 0, 49],
    ['Power Bank 30000mAh Charge Rapide', 'power-bank-30000mah', 15000, 28000, 'https://images.unsplash.com/photo-1700984434959-36f762cf65f5?w=400&q=80', 'neuf', 40, 5, 0, 47],
    ['Lampe LED Éclairage Plateforme TikTok', 'lampe-led-tiktok', 8000, 15000, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', 'neuf', 25, 5, 0, 47],
    ['Caméra de Surveillance WiFi 360°', 'camera-surveillance-wifi', 22000, 40000, 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&q=80', 'neuf', 15, 5, 0, 45],
    ['Clavier Mécanique RGB Rétroéclairé', 'clavier-mecanique-rgb', 16000, 30000, 'https://images.unsplash.com/photo-1541140532154-b024d1e5c556?w=400&q=80', 'neuf', 18, 5, 0, 47],
    ['Souris Gaming Sans Fil RGB', 'souris-gaming-sans-fil', 10000, 20000, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&q=80', 'neuf', 22, 5, 0, 50],
    ['Casque Audio Bluetooth ANC', 'casque-audio-bluetooth-anc', 28000, 50000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', 'neuf', 12, 5, 1, 44],
    ['Drone Mini Caméra HD Pliable', 'drone-mini-camera-hd', 45000, 75000, 'https://images.unsplash.com/photo-1473968512647-3e8f82feb83a?w=400&q=80', 'neuf', 8, 5, 1, 40],
    ['Bracelet Connecté Fitness Tracker', 'bracelet-connecte-fitness', 10000, 20000, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400&q=80', 'neuf', 35, 5, 0, 50],
    ['Mini Projecteur LED HD 1080p', 'mini-projecteur-led-hd', 35000, 60000, 'https://images.unsplash.com/photo-1599313804995-12e0a0f7d98f?w=400&q=80', 'neuf', 10, 5, 0, 42],
    ['Station de Charge Sans Fil 3-en-1', 'station-charge-sans-fil', 14000, 25000, 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=400&q=80', 'neuf', 20, 5, 0, 44],
    ['Appareil Photo Numérique Compact 4K', 'appareil-photo-numerique-4k', 55000, 85000, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80', 'neuf', 7, 5, 0, 36],
    ['Lunettes Audio Bluetooth Solaires', 'lunettes-audio-bluetooth', 18000, 32000, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80', 'neuf', 15, 5, 0, 44],
    ['Sac à Dos Anti-vol USB Chargeur', 'sac-dos-antivol-usb', 15000, 28000, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80', 'neuf', 25, 5, 0, 47],
    ['Kit Manucure Électrique Rechargeable', 'kit-manucure-electrique', 8500, 16000, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', 'neuf', 30, 5, 0, 47],
    ['Brosse à Cheveux Ionique Chauffante', 'brosse-cheveux-ionique', 12000, 22000, 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&q=80', 'neuf', 20, 5, 0, 46],
    ['Miroir LED Lumineux Portable', 'miroir-led-portable', 7000, 14000, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80', 'neuf', 28, 5, 0, 50],
    ['Montre Digitale Sport Étanche', 'montre-digitale-sport', 6000, 12000, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80', 'neuf', 35, 5, 0, 50],
  ];

  const prodStmt = db.prepare(`INSERT OR IGNORE INTO products (name, slug, price, old_price, image, condition, stock, category_id, featured, discount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of products) prodStmt.run(...p);

  console.log('Base de donnees initialisee avec succes !');
  console.log(`  ${categories.length} categories, ${products.length} produits (dont 20 style Temu/Shein/AliExpress)`);
  process.exit(0);
})();
