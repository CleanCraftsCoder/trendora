/**
 * Cache Utility
 * Handles Redis caching with fallback to in-memory cache
 */

const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let useRedis = false;
const memoryCache = {};

/**
 * Initialize Redis connection
 */
const initRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    logger.info(`Attempting to connect to Redis at: ${redisUrl}`);
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 2) {
            // Stop retrying to connect after 2 retries
            return false;
          }
          return 1000; // retry after 1 sec
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.warn(`Redis connection failed (using in-memory cache): ${err.message}`);
      useRedis = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis Cache Connected successfully');
      useRedis = true;
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn(`Could not connect to Redis (using in-memory cache): ${err.message}`);
    useRedis = false;
  }
};

initRedis();

/**
 * Get item from cache
 * @param {string} key 
 * @returns {Promise<*>}
 */
const get = async (key) => {
  if (useRedis && redisClient?.isOpen) {
    try {
      const val = await redisClient.get(key);
      if (val) {
        logger.debug(`Redis Cache Hit: ${key}`);
        return JSON.parse(val);
      }
    } catch (err) {
      logger.error(`Redis get error for key ${key}: ${err.message}`);
    }
  }

  // Memory Fallback
  const cachedItem = memoryCache[key];
  if (cachedItem && Date.now() < cachedItem.expiry) {
    logger.debug(`Memory Cache Hit: ${key}`);
    return cachedItem.data;
  }
  if (cachedItem) {
    logger.debug(`Memory Cache Expired: ${key}`);
    delete memoryCache[key];
  }
  return null;
};

/**
 * Set item in cache
 * @param {string} key 
 * @param {*} value 
 * @param {number} ttlSeconds 
 * @returns {Promise<boolean>}
 */
const set = async (key, value, ttlSeconds = 1800) => {
  if (useRedis && redisClient?.isOpen) {
    try {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      logger.debug(`Redis Cache Set: ${key} (${ttlSeconds}s)`);
      return true;
    } catch (err) {
      logger.error(`Redis set error for key ${key}: ${err.message}`);
    }
  }

  // Memory Fallback
  logger.debug(`Memory Cache Set: ${key} (${ttlSeconds}s)`);
  memoryCache[key] = {
    data: value,
    expiry: Date.now() + ttlSeconds * 1000,
  };
  return true;
};

/**
 * Delete item from cache
 * @param {string} key 
 * @returns {Promise<boolean>}
 */
const del = async (key) => {
  if (useRedis && redisClient?.isOpen) {
    try {
      await redisClient.del(key);
      logger.debug(`Redis Cache Del: ${key}`);
      return true;
    } catch (err) {
      logger.error(`Redis del error for key ${key}: ${err.message}`);
    }
  }

  // Memory Fallback
  logger.debug(`Memory Cache Del: ${key}`);
  delete memoryCache[key];
  return true;
};

/**
 * Clear cache keys matching a pattern (prefix match)
 * @param {string} pattern 
 * @returns {Promise<boolean>}
 */
const clearPattern = async (pattern) => {
  if (useRedis && redisClient?.isOpen) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      logger.debug(`Redis Cache Cleared Pattern: ${pattern} (${keys.length} keys)`);
      return true;
    } catch (err) {
      logger.error(`Redis clearPattern error for pattern ${pattern}: ${err.message}`);
    }
  }

  // Memory Fallback
  logger.debug(`Memory Cache Cleared Pattern: ${pattern}`);
  const prefix = pattern.replace('*', '');
  let count = 0;
  for (const key in memoryCache) {
    if (key.startsWith(prefix)) {
      delete memoryCache[key];
      count++;
    }
  }
  return true;
};

module.exports = {
  get,
  set,
  del,
  clearPattern,
};
