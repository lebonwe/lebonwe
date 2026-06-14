const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', process.env.DB_PATH || './data/lebonwe.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db = null;

function save() {
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

async function init() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) db = new SQL.Database(fs.readFileSync(dbPath));
  else db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    icon TEXT, color TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    description TEXT, price INTEGER NOT NULL, old_price INTEGER, image TEXT,
    condition TEXT DEFAULT 'neuf', stock INTEGER DEFAULT 0,
    category_id INTEGER REFERENCES categories(id), featured INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL, customer_email TEXT, address TEXT,
    city TEXT DEFAULT 'Abidjan', notes TEXT, total INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(session_id, product_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    phone TEXT, password TEXT NOT NULL, address TEXT, city TEXT DEFAULT 'Abidjan',
    auth_token TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS customer_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
    order_id INTEGER NOT NULL REFERENCES orders(id), UNIQUE(customer_id, order_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, title TEXT,
  subtitle TEXT, image TEXT, link TEXT, active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
  db.run(`CREATE TABLE IF NOT EXISTS site_config (
  config_key TEXT PRIMARY KEY, config_value TEXT
)`);
  db.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'commercial',
    active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  // Seed default super admin (password: admin123) if not exists
  const crypto = require('crypto');
  const adminHash = crypto.createHash('sha256').update('admin123' + 'lebonwe_salt_2026').digest('hex');
  const existingAdmin = db.exec('SELECT id FROM admin_users WHERE email = \'admin@lebonwe.ci\'');
  if (!existingAdmin[0]?.values?.length) {
    db.run('INSERT INTO admin_users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Super Admin', 'admin@lebonwe.ci', adminHash, 'super_admin']);
  }

  try { db.run('ALTER TABLE admin_users ADD COLUMN auth_token TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT \'pending\''); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN delivery_tracking TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN delivery_notes TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN points_used INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN points_earned INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE orders ADD COLUMN referral_code TEXT'); } catch (_) {}
  try { db.run('ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0'); } catch (_) {}
  try { db.run('ALTER TABLE customers ADD COLUMN referral_code TEXT'); } catch (_) {}
  try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_referral ON customers(referral_code)'); } catch (_) {}
  try { db.run('ALTER TABLE customers ADD COLUMN referred_by TEXT'); } catch (_) {}
  db.run(`CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, product_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, product_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS delivery_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id),
    method TEXT NOT NULL, amount INTEGER NOT NULL, phone TEXT,
    transaction_id TEXT, status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER REFERENCES customers(id),
    type TEXT NOT NULL, title TEXT NOT NULL, message TEXT,
    link TEXT, read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS loyalty_points_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
    points INTEGER NOT NULL, reason TEXT, order_id INTEGER REFERENCES orders(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    reason TEXT NOT NULL, status TEXT DEFAULT 'pending',
    resolution TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER REFERENCES orders(id),
    customer_id INTEGER REFERENCES customers(id),
    admin_id INTEGER REFERENCES admin_users(id),
    message TEXT NOT NULL, direction TEXT NOT NULL DEFAULT 'customer',
    read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL, type TEXT NOT NULL,
    reference TEXT, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, value TEXT NOT NULL, price_modifier INTEGER DEFAULT 0,
    stock INTEGER DEFAULT 0, sku TEXT, UNIQUE(product_id, name, value)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS flash_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id),
    discount_percent INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
    max_quantity INTEGER DEFAULT 0, sold_count INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
    label TEXT, address TEXT NOT NULL, city TEXT DEFAULT 'Abidjan',
    phone TEXT, is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS promo_code_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT, promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
    customer_id INTEGER REFERENCES customers(id),
    order_id INTEGER REFERENCES orders(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS recurring_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL REFERENCES customers(id),
    product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL DEFAULT 1,
    frequency TEXT NOT NULL, next_date TEXT NOT NULL,
    active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS newsletter_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    filter_categories TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscription (
    id INTEGER PRIMARY KEY AUTOINCREMENT, subscriber_id INTEGER NOT NULL REFERENCES subscribers(id),
    segment_id INTEGER REFERENCES newsletter_segments(id),
    categories TEXT, unsubscribed INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL,
    size INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`PRAGMA user_version = 2`);
  db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', discount_value INTEGER NOT NULL,
  min_amount INTEGER DEFAULT 0, start_date TEXT, end_date TEXT,
  usage_limit INTEGER DEFAULT 0, used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
  const defaultConfig = [
    ['site_name', 'lebonwé'],
    ['contact_email', 'contact@lebonwe.ci'],
    ['contact_phone', '+225 05 05 05 05'],
    ['address', 'Abidjan, Cocody'],
    ['facebook', '#'],
    ['twitter', '#'],
    ['instagram', '#'],
    ['payment_methods', 'Orange Money,MTN Money,Wave,Visa'],
    ['delivery_fee', '0'],
    ['currency', 'FCFA']
  ];
  for (const [k, v] of defaultConfig) {
    db.run('INSERT OR IGNORE INTO site_config (config_key, config_value) VALUES (?, ?)', [k, v]);
  }
  save();
}

const dbWrapper = {
  prepare(sql) {
    return {
      run(...params) {
        if (params.length) {
          db.run(sql, params);
        } else {
          db.run(sql);
        }
        const lastId = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
        save();
        return { lastInsertRowid: lastId };
      },
      get(...params) {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
      },
      all(...params) {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params);
        const results = [];
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free();
        return results;
      }
    };
  },
  exec(sql) { db.exec(sql); save(); }
};

module.exports = { init, db: dbWrapper, save };
