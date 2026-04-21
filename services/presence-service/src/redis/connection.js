const redis = require('redis');
const logger = require('@messagemesh/middleware').logger;

let redisClient = null;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      logger.error({ message: 'Redis client error', error: err.message, stack: err.stack, service: 'presence-service' });
    });

    await redisClient.connect();
    logger.info({ message: 'Redis connected', service: 'presence-service' });
    return redisClient;
  } catch (error) {
    logger.error({ message: 'Failed to connect to Redis', error: error.message, stack: error.stack, service: 'presence-service' });
    throw error;
  }
};

const getRedis = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info({ message: 'Redis connection closed', service: 'presence-service' });
    } catch (error) {
      logger.error({ message: 'Error closing Redis connection', error: error.message, stack: error.stack, service: 'presence-service' });
    }
  }
};

module.exports = {
  connectRedis,
  getRedis,
  closeRedis,
};
