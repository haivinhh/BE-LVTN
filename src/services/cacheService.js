const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

const getClient = () => {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    client.on('connect', () => {
      isConnected = true;
      logger.info('[Redis] Connected');
    });

    client.on('error', (err) => {
      isConnected = false;
      logger.warn(`[Redis] Connection error: ${err.message} — cache disabled`);
    });

    client.on('close', () => {
      isConnected = false;
    });

    client.connect().catch(() => {});
  }
  return client;
};

/**
 * Cache Service — tất cả operations đều graceful degrade nếu Redis down
 */
const cacheService = {
  /**
   * Get cached value. Returns parsed object or null.
   */
  async get(key) {
    try {
      const c = getClient();
      if (!isConnected) return null;
      const value = await c.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.warn(`[Cache] GET error for "${key}": ${err.message}`);
      return null;
    }
  },

  /**
   * Set key with TTL (seconds). Default 5 minutes.
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      const c = getClient();
      if (!isConnected) return;
      await c.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      logger.warn(`[Cache] SET error for "${key}": ${err.message}`);
    }
  },

  /**
   * Delete a single key.
   */
  async del(key) {
    try {
      const c = getClient();
      if (!isConnected) return;
      await c.del(key);
    } catch (err) {
      logger.warn(`[Cache] DEL error for "${key}": ${err.message}`);
    }
  },

  /**
   * Invalidate all keys matching a pattern (e.g. "products:*")
   */
  async invalidatePattern(pattern) {
    try {
      const c = getClient();
      if (!isConnected) return;
      const keys = await c.keys(pattern);
      if (keys.length > 0) {
        await c.del(...keys);
        logger.info(`[Cache] Invalidated ${keys.length} keys matching "${pattern}"`);
      }
    } catch (err) {
      logger.warn(`[Cache] invalidatePattern error for "${pattern}": ${err.message}`);
    }
  },

  /**
   * Cache-aside helper: try cache first, else run fn(), cache result.
   */
  async remember(key, ttlSeconds, fn) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  },

  /**
   * Flush all cache (use with caution)
   */
  async flush() {
    try {
      const c = getClient();
      if (!isConnected) return;
      await c.flushdb();
      logger.info('[Cache] Flushed all keys');
    } catch (err) {
      logger.warn(`[Cache] flush error: ${err.message}`);
    }
  },

  isReady: () => isConnected,
};

module.exports = cacheService;
