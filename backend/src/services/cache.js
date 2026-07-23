/**
 * cache.js
 * Redis read/write wrapper for AirSense backend.
 * If Redis is unavailable, silently degrades (no caching, no crash).
 */

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

let redisClient = null;
let redisAvailable = false;

async function initRedis() {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => {
      if (redisAvailable) {
        console.warn('[REDIS] Connection error — caching disabled:', err.message);
      }
      redisAvailable = false;
    });
    await redisClient.connect();
    redisAvailable = true;
    console.log('✅ Redis connected:', REDIS_URL);
  } catch (err) {
    console.warn('⚠️  Redis unavailable — running without cache:', err.message);
    redisAvailable = false;
  }
}

// Initialize on module load
initRedis();

/**
 * Get a cached value by key. Returns null if cache miss or Redis unavailable.
 */
async function getCache(key) {
  if (!redisAvailable || !redisClient) return null;
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value. Silently fails if Redis unavailable.
 */
async function setCache(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!redisAvailable || !redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Silent fail — caching is best-effort
  }
}

async function closeRedis() {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch {
    // Best-effort cleanup for one-off scripts.
  } finally {
    redisAvailable = false;
    redisClient = null;
  }
}

module.exports = { getCache, setCache, initRedis, closeRedis };
