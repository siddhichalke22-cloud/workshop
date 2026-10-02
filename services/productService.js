const productDatabase = require('../database/productDatabase');

async function getProducts() {
  return productDatabase.readProducts();
}

async function getProductById(id) {
  const products = await productDatabase.readProducts();
  return products.find((product) => product.id === id) || null;
}

async function createProduct(data) {
  const products = await productDatabase.readProducts();
  const nextId = products.reduce((maxId, product) => Math.max(maxId, product.id), 0) + 1;
  const product = { ...data, id: nextId };
  products.push(product);
  await productDatabase.writeProducts(products);
  return product;
}

async function updateProduct(id, data, replace = false) {
  const products = await productDatabase.readProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return null;

  products[index] = replace
    ? { ...data, id }
    : { ...products[index], ...data, id };
  await productDatabase.writeProducts(products);
  return products[index];
}

async function deleteProduct(id) {
  const products = await productDatabase.readProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return false;

  products.splice(index, 1);
  await productDatabase.writeProducts(products);
  return true;
}

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };