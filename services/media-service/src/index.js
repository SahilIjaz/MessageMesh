require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { getConnection, closeConnection } = require('./database/connection');
const { requestIdMiddleware } = require('@messagemesh/middleware');
const { validateJWT } = require('@messagemesh/middleware');
const { errorHandler } = require('@messagemesh/middleware');
const { initEventBus, closeEventBus } = require('@messagemesh/events').eventBus;
const mediaRoutes = require('./routes/media-routes');
const { logger } = require('@messagemesh/middleware');

const app = express();
const PORT = process.env.PORT || 3006;
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

app.use(express.json());
app.use(requestIdMiddleware);

const runMigrations = async () => {
  try {
    const db = getConnection();
    await db.migrate.latest();
    logger.info('Database migrations completed');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created upload directory: ${uploadDir}`);
  }
};

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'media-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/media', validateJWT, mediaRoutes);

app.get('/media/files/:fileId', (req, res, next) => {
  require('./routes/media-routes').get('/files/:fileId')(req, res, next);
});

app.get('/media/serve/:fileId', (req, res, next) => {
  require('./routes/media-routes').get('/serve/:fileId')(req, res, next);
});

app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

const startServer = async () => {
  try {
    ensureUploadDir();
    await runMigrations();

    try {
      await Promise.race([
        initEventBus(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event bus initialization timeout')), 5000))
      ]);
      logger.info('Event bus initialized');
    } catch (eventBusError) {
      logger.warn(`Event bus connection failed: ${eventBusError.message}, continuing without event bus`);
    }

    app.listen(PORT, () => {
      logger.info(`Media Service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message, err.stack);
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
