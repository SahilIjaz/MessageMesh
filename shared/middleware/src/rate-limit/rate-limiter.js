const redis = require('redis');

let redisClient;

const initRedis = async () => {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });
  await redisClient.connect();
  return redisClient;
};

const rateLimiter = (maxRequests = 100, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      if (!redisClient) {
        await initRedis();
      }

      const userId = req.userId || req.ip;
      const key = `ratelimit:${userId}`;
      const current = await redisClient.incr(key);

      if (current === 1) {
        await redisClient.expire(key, windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);
        return res.status(429).json({
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Maximum ${maxRequests} requests per ${windowSeconds} seconds`,
          retryAfter: windowSeconds,
        });
      }

      next();
    } catch (error) {
      // Fail open - don't block request if Redis is down
      next();
    }
  };
};

module.exports = rateLimiter;
module.exports.initRedis = initRedis;
