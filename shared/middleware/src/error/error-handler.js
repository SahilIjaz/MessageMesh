const logger = require('../logging/logger');

const errorHandler = (err, req, res, next) => {
  const requestId = req.id || 'unknown';

  // Log error with context
  logger.error({
    requestId,
    userId: req.userId || 'anonymous',
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
    requestId,
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
};

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = errorHandler;
module.exports.AppError = AppError;
