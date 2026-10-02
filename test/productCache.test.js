const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const test = require('node:test');
const app = require('../server');
const productDatabase = require('../database/productDatabase');
const { cache, CACHE_TTL_MS } = require('../middleware/cacheMiddleware');

async function withServer(run) {
  cache.clear();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;

  async function request(url, options) {
    const response = await fetch(`${origin}${url}`, options);
    const body = response.status === 204 ? null : await response.json();
    return { response, body };
  }

  try {
    await run(request);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function assertCache(request, url, statusCode, cacheStatus) {
  const { response } = await request(url);
  assert.equal(response.status, statusCode);
  assert.equal(response.headers.get('x-cache'), cacheStatus);
}

async function primeProductCaches(request, productId = 1) {
  await assertCache(request, '/products', 200, 'MISS');
  await assertCache(request, `/products/${productId}`, 200, 'MISS');
}

async function assertProductCachesInvalidated(request, productId = 1) {
  await assertCache(request, '/products', 200, 'MISS');
  await assertCache(request, `/products/${productId}`, 200, 'MISS');
}

async function createTemporaryProduct(request) {
  const { response, body } = await request('/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Automated test product', price: 1 }),
  });
  assert.equal(response.status, 201);
  return body;
}

async function cleanTemporaryProduct(request, productId) {
  if (productId !== undefined) {
    await request(`/products/${productId}`, { method: 'DELETE' });
  }
}

test('Folder Structure: required folders exist', async () => {
  for (const directory of ['routes', 'middleware', 'controllers', 'services', 'database']) {
    const details = await fs.stat(path.join(__dirname, '..', directory));
    assert.ok(details.isDirectory(), `${directory} must be a directory`);
  }
});

test('GET /products: caching and X-Cache headers (MISS then HIT)', async () => {
  await withServer(async (request) => {
    await assertCache(request, '/products', 200, 'MISS');
    await assertCache(request, '/products', 200, 'HIT');
  });
});

test('GET /products/:id: caching and X-Cache headers (MISS then HIT)', async () => {
  await withServer(async (request) => {
    await assertCache(request, '/products/1', 200, 'MISS');
    await assertCache(request, '/products/1', 200, 'HIT');
  });
});

test('GET /products/:id: 404 response is not cached as 200', async () => {
  await withServer(async (request) => {
    await assertCache(request, '/products/99999', 404, 'MISS');
    await assertCache(request, '/products/99999', 404, 'MISS');
  });
});

test('Cache Entry metadata: stores createdAt timestamp', async () => {
  await withServer(async (request) => {
    await assertCache(request, '/products', 200, 'MISS');
    const entry = cache.get('/products');
    assert.equal(typeof entry.createdAt, 'number');
    assert.equal(entry.expiresAt, entry.createdAt + CACHE_TTL_MS);
  });
});

test('TTL Expiration: expired entries trigger a fresh database fetch', async () => {
  const realNow = Date.now;
  let mockedNow = realNow();
  let reads = 0;
  const originalReadProducts = productDatabase.readProducts;
  Date.now = () => mockedNow;
  productDatabase.readProducts = async () => {
    reads += 1;
    return originalReadProducts();
  };

  try {
    await withServer(async (request) => {
      await assertCache(request, '/products', 200, 'MISS');
      await assertCache(request, '/products', 200, 'HIT');
      assert.equal(reads, 1);

      mockedNow += CACHE_TTL_MS + 1;
      await assertCache(request, '/products', 200, 'MISS');
      assert.equal(reads, 2);
    });
  } finally {
    productDatabase.readProducts = originalReadProducts;
    Date.now = realNow;
  }
});

test('Cache Invalidation: POST /products invalidates stale entries', async () => {
  await withServer(async (request) => {
    let productId;
    try {
      await primeProductCaches(request);
      const product = await createTemporaryProduct(request);
      productId = product.id;
      await assertProductCachesInvalidated(request);
    } finally {
      await cleanTemporaryProduct(request, productId);
    }
  });
});

test('Cache Invalidation: PUT /products/:id invalidates stale entries', async () => {
  await withServer(async (request) => {
    let productId;
    try {
      const product = await createTemporaryProduct(request);
      productId = product.id;
      await primeProductCaches(request, productId);
      const result = await request(`/products/${productId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Updated test product', price: 2 }),
      });
      assert.equal(result.response.status, 200);
      await assertProductCachesInvalidated(request, productId);
    } finally {
      await cleanTemporaryProduct(request, productId);
    }
  });
});

test('Cache Invalidation: PATCH /products/:id invalidates stale entries', async () => {
  await withServer(async (request) => {
    let productId;
    try {
      const product = await createTemporaryProduct(request);
      productId = product.id;
      await primeProductCaches(request, productId);
      const result = await request(`/products/${productId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ price: 3 }),
      });
      assert.equal(result.response.status, 200);
      await assertProductCachesInvalidated(request, productId);
    } finally {
      await cleanTemporaryProduct(request, productId);
    }
  });
});

test('Cache Invalidation: DELETE /products/:id invalidates stale entries', async () => {
  await withServer(async (request) => {
    let productId;
    try {
      const product = await createTemporaryProduct(request);
      productId = product.id;
      await primeProductCaches(request, productId);
      const result = await request(`/products/${productId}`, { method: 'DELETE' });
      assert.equal(result.response.status, 204);
      await assertCache(request, '/products', 200, 'MISS');
      await assertCache(request, `/products/${productId}`, 404, 'MISS');
    } finally {
      await cleanTemporaryProduct(request, productId);
    }
  });
});

test('Failed mutations (400 Bad Request) do not invalidate cache', async () => {
  await withServer(async (request) => {
    await primeProductCaches(request);
    const result = await request('/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(result.response.status, 400);
    await assertCache(request, '/products', 200, 'HIT');
    await assertCache(request, '/products/1', 200, 'HIT');
  });
});