const { db } = require('../config/db');

const Order = {
  getAll() {
    return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  },

  getById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (order) {
      order.items = db.prepare(`SELECT oi.*, p.name as product_name, p.image
        FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`).all(id);
    }
    return order;
  },

  create(data) {
    const r = db.prepare(`INSERT INTO orders (customer_name, customer_phone, customer_email, address, city, notes, total, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      data.customer_name, data.customer_phone, data.customer_email || null,
      data.address || null, data.city || 'Abidjan', data.notes || null, data.total, data.payment_method || null);

    if (data.items && data.items.length) {
      const ins = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
      for (const item of data.items) ins.run(r.lastInsertRowid, item.product_id, item.quantity, item.unit_price);
    }
    return Order.getById(r.lastInsertRowid);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return Order.getById(id);
  }
};

module.exports = Order;
