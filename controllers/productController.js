const productService = require('../services/productService');

function validateProduct(data, requireAllFields) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const allowedFields = ['name', 'price'];
  const fields = Object.keys(data);
  if (fields.some((field) => !allowedFields.includes(field))) return false;
  if (requireAllFields && (!fields.includes('name') || !fields.includes('price'))) return false;
  if (!requireAllFields && fields.length === 0) return false;
  if ('name' in data && (typeof data.name !== 'string' || data.name.trim().length === 0)) return false;
  if ('price' in data && (typeof data.price !== 'number' || !Number.isFinite(data.price) || data.price < 0)) return false;
  return true;
}

async function getProducts(req, res, next) {
  try {
    res.json(await productService.getProducts());
  } catch (error) {
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const product = await productService.getProductById(Number(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    if (!validateProduct(req.body, true)) {
      return res.status(400).json({ error: 'Product name and non-negative numeric price are required' });
    }
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function replaceProduct(req, res, next) {
  try {
    if (!validateProduct(req.body, true)) {
      return res.status(400).json({ error: 'Product name and non-negative numeric price are required' });
    }
    const product = await productService.updateProduct(Number(req.params.id), req.body, true);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function patchProduct(req, res, next) {
  try {
    if (!validateProduct(req.body, false)) {
      return res.status(400).json({ error: 'Provide valid product fields to update' });
    }
    const product = await productService.updateProduct(Number(req.params.id), req.body);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const deleted = await productService.deleteProduct(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  replaceProduct,
  patchProduct,
  deleteProduct,
};