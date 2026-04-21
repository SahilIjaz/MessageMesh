require('dotenv').config();
const express = require('express');
const { getConnection, closeConnection } = require('./database/connection');
const { requestIdMiddleware } = require('@messagemesh/middleware');
const { validateJWT } = require('@messagemesh/middleware');
const { errorHandler } = require('@messagemesh/middleware');
const { initEventBus, closeEventBus } = require('@messagemesh/events').eventBus;
const { initEventConsumers } = require('./events/event-consumers');
const notificationRoutes = require('./routes/notification-routes');
const { logger } = require('@messagemesh/middleware');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.use(requestIdMiddleware);

const runMigrations = async () => {
  try {
    const db = getConnection();
    await db.migrate.latest();
    logger.info('Database migrations completed');
  } catch (err) {
    logger.error('Migration failed', err);
    process.exit(1);
  }
};

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/', validateJWT, notificationRoutes);

app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

const startServer = async () => {
  try {
    await runMigrations();

    try {
      await Promise.race([
        initEventBus(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event bus initialization timeout')), 5000))
      ]);
      logger.info('Event bus initialized');
      await initEventConsumers();
      logger.info('Event consumers initialized');
    } catch (eventBusError) {
      logger.warn(`Event bus connection failed: ${eventBusError.message}, continuing without event bus`);
    }

    app.listen(PORT, () => {
      logger.info(`Notification Service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeEventBus();
  await closeConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await closeEventBus();
  await closeConnection();
  process.exit(0);
});

startServer();

module.exports = app;
