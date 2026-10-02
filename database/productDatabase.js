const fs = require('fs/promises');
const path = require('path');

const filePath = path.join(__dirname, '..', 'db.json');

async function readProducts() {
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents);
}

async function writeProducts(products) {
  await fs.writeFile(filePath, `${JSON.stringify(products, null, 2)}\n`);
}

module.exports = { readProducts, writeProducts };