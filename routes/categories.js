const { Router } = require('express');
const Category = require('../models/Category');

const router = Router();

function slugify(text) {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

router.get('/', (req, res) => {
  res.json(Category.getAll());
});

router.get('/:id', (req, res) => {
  const cat = /^\d+$/.test(req.params.id)
    ? Category.getById(parseInt(req.params.id))
    : Category.getBySlug(req.params.id);
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
  res.json(cat);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  const slug = req.body.slug || slugify(name);
  const cat = Category.create({ ...req.body, slug });
  res.status(201).json(cat);
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Category.getById(id)) return res.status(404).json({ error: 'Catégorie introuvable' });
  res.json(Category.update(id, req.body));
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (!Category.getById(id)) return res.status(404).json({ error: 'Catégorie introuvable' });
  Category.delete(id);
  res.json({ message: 'Catégorie supprimée' });
});

module.exports = router;
