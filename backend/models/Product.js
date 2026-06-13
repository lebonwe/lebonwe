const { db } = require('../config/db');

const Product = {
  getAll(filters = {}) {
    let sql = `SELECT p.*, c.name as category_name, c.slug as category_slug
               FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
    const params = [];
    if (filters.condition) { sql += ' AND p.condition = ?'; params.push(filters.condition); }
    if (filters.category_id) { sql += ' AND p.category_id = ?'; params.push(Number(filters.category_id)); }
    if (filters.featured) { sql += ' AND p.featured = 1'; }
    if (filters.search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${filters.search}%`, `%${filters.search}%`); }
    sql += ' ORDER BY p.created_at DESC';
    if (filters.limit) { sql += ' LIMIT ?'; params.push(Number(filters.limit)); }
    return db.prepare(sql).all(...params);
  },

  getById(id) {
    return db.prepare(`SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`).get(id);
  },

  getBySlug(slug) {
    return db.prepare(`SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?`).get(slug);
  },

  create(data) {
    const r = db.prepare(`INSERT INTO products (name, slug, description, price, old_price, image, condition, stock, category_id, featured, discount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      data.name, data.slug, data.description || null, data.price, data.old_price || null,
      data.image || null, data.condition || 'neuf', data.stock || 0, data.category_id || null,
      data.featured || 0, data.discount || 0);
    return Product.getById(r.lastInsertRowid);
  },

  update(id, data) {
    const fields = []; const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') { fields.push(`${key} = ?`); values.push(val); }
    }
    values.push(id);
    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return Product.getById(id);
  },

  delete(id) { db.prepare('DELETE FROM products WHERE id = ?').run(id); },

  getFeatured(limit = 6) {
    return db.prepare(`SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.featured = 1 ORDER BY p.created_at DESC LIMIT ?`).all(limit);
  }
};

module.exports = Product;
