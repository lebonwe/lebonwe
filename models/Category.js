const { db } = require('../config/db');

const Category = {
  getAll() {
    return db.prepare(`SELECT c.*, COUNT(p.id) as product_count
      FROM categories c LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id ORDER BY c.name`).all();
  },

  getById(id) { return db.prepare('SELECT * FROM categories WHERE id = ?').get(id); },
  getBySlug(slug) { return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug); },

  create(data) {
    const r = db.prepare('INSERT INTO categories (name, slug, icon, color) VALUES (?, ?, ?, ?)').run(
      data.name, data.slug, data.icon || null, data.color || null);
    return Category.getById(r.lastInsertRowid);
  },

  update(id, data) {
    const fields = []; const values = [];
    for (const [key, val] of Object.entries(data)) {
      if (key !== 'id') { fields.push(`${key} = ?`); values.push(val); }
    }
    values.push(id);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return Category.getById(id);
  },

  delete(id) { db.prepare('DELETE FROM categories WHERE id = ?').run(id); }
};

module.exports = Category;
