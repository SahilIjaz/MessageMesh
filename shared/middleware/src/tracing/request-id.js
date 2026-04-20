const { v4: uuidv4 } = require('uuid');

const requestIdMiddleware = (req, res, next) => {
  // Use provided X-Request-Id or generate new one
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-Id', req.id);

  // Log request
  const logger = require('../logging/logger');
  logger.info({
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.userId || 'anonymous',
    ip: req.ip,
  });

  next();
};

module.exports = requestIdMiddleware;
