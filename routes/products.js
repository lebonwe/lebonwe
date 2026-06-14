const { Router } = require('express');
const Product = require('../models/Product');

const router = Router();

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

router.get('/', (req, res) => {
  const products = Product.getAll(req.query);
  res.json(products);
});

router.get('/featured', (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  const products = Product.getFeatured(limit);
  res.json(products);
});

router.get('/:id', (req, res) => {
  const product = /^\d+$/.test(req.params.id)
    ? Product.getById(parseInt(req.params.id))
    : Product.getBySlug(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(product);
});

router.post('/', (req, res) => {
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Nom et prix requis' });
  const slug = req.body.slug || slugify(name) + '-' + Date.now();
  const product = Product.create({ ...req.body, slug });
  res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Product.getById(id)) return res.status(404).json({ error: 'Produit introuvable' });
  const product = Product.update(id, req.body);
  res.json(product);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Product.getById(id)) return res.status(404).json({ error: 'Produit introuvable' });
  Product.delete(id);
  res.json({ message: 'Produit supprimé' });
});

module.exports = router;
