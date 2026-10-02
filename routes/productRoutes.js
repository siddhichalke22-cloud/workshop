const express = require('express');
const productController = require('../controllers/productController');
const { cacheResponse, invalidateCacheOnSuccess } = require('../middleware/cacheMiddleware');

const router = express.Router();

router.get('/', cacheResponse, productController.getProducts);
router.get('/:id', cacheResponse, productController.getProductById);
router.post('/', invalidateCacheOnSuccess, productController.createProduct);
router.put('/:id', invalidateCacheOnSuccess, productController.replaceProduct);
router.patch('/:id', invalidateCacheOnSuccess, productController.patchProduct);
router.delete('/:id', invalidateCacheOnSuccess, productController.deleteProduct);

module.exports = router;