require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth-routes');
const { errorHandler } = require('@messagemesh/middleware');
const { requestIdMiddleware } = require('@messagemesh/middleware');
const { initEventBus } = require('@messagemesh/events').eventBus;
const logger = require('@messagemesh/middleware').logger;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(requestIdMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/auth', authRoutes);

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
      service: 'auth-service',
    });

    app.listen(PORT, () => {
      logger.info({
        message: `Auth service running on port ${PORT}`,
        service: 'auth-service',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error({
      message: 'Failed to start auth service',
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
    service: 'auth-service',
  });
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({
    message: 'SIGINT signal received: closing HTTP server',
    service: 'auth-service',
  });
  process.exit(0);
});

startServer();

module.exports = app;
