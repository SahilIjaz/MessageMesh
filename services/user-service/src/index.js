require('dotenv').config();
const express = require('express');
const { errorHandler, requestIdMiddleware } = require('@messagemesh/middleware');
const { initEventBus } = require('@messagemesh/events').eventBus;
const { logger } = require('@messagemesh/middleware');
const { closeConnection } = require('./database/connection');
const { initEventConsumers } = require('./events/event-consumers');
const userRoutes = require('./routes/user-routes');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(requestIdMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'user-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// Error handler
app.use(errorHandler);

// Initialize and start server
const startServer = async () => {
  try {
    // Initialize event bus
    await initEventBus();
    logger.info({
      message: 'Event bus initialized',
      service: 'user-service',
    });

    // Initialize event consumers
    await initEventConsumers();

    app.listen(PORT, () => {
      logger.info({
        message: `User service running on port ${PORT}`,
        service: 'user-service',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error({
      message: 'Failed to start user service',
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({
    message: 'SIGTERM signal received: closing HTTP server',
    service: 'user-service',
  });
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({
    message: 'SIGINT signal received: closing HTTP server',
    service: 'user-service',
  });
  await closeConnection();
  process.exit(0);
});

startServer();

module.exports = app;
