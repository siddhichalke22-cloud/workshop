const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function cacheResponse(req, res, next) {
  const key = req.originalUrl;
  const entry = cache.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(entry.body);
  }

  if (entry) cache.delete(key);
  res.setHeader('X-Cache', 'MISS');

  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return sendJson(body);
  };

  next();
}

function invalidateCacheOnSuccess(req, res, next) {
  res.once('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) cache.clear();
  });
  next();
}

module.exports = { cacheResponse, invalidateCacheOnSuccess };