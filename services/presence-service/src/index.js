require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { errorHandler, requestIdMiddleware } = require('@messagemesh/middleware');
const { initEventBus, closeEventBus } = require('@messagemesh/events').eventBus;
const logger = require('@messagemesh/middleware').logger;

const { connectRedis, closeRedis } = require('./redis/connection');
const { initWsServer } = require('./websocket/ws-server');
const { initEventConsumers } = require('./events/event-consumers');
const presenceRoutes = require('./routes/presence-routes');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.use(cors());
app.use(requestIdMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'presence-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/status', presenceRoutes);

app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

app.use(errorHandler);

const startServer = async () => {
  let server = null;

  try {
    await connectRedis();
    logger.info({ message: 'Redis connected', service: 'presence-service' });

    try {
      await Promise.race([
        initEventBus(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Event bus initialization timeout')), 5000))
      ]);
      logger.info({ message: 'Event bus initialized', service: 'presence-service' });

      await initEventConsumers();
      logger.info({ message: 'Event consumers initialized', service: 'presence-service' });
    } catch (eventBusError) {
      logger.warn({
        message: 'Event bus connection failed, continuing without event bus',
        error: eventBusError.message,
        service: 'presence-service',
      });
    }

    server = http.createServer(app);
    initWsServer(server);

    server.listen(PORT, () => {
      logger.info({
        message: `Presence service running on port ${PORT}`,
        service: 'presence-service',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error({
      message: 'Failed to start presence service',
      error: error.message,
      stack: error.stack,
      service: 'presence-service',
    });
    process.exit(1);
  }

  const gracefulShutdown = async () => {
    logger.info({ message: 'Shutting down presence service', service: 'presence-service' });

    try {
      if (server) {
        server.close(() => {
          logger.info({ message: 'Server closed', service: 'presence-service' });
        });
      }
      await closeEventBus();
      await closeRedis();
      logger.info({ message: 'Presence service shutdown complete', service: 'presence-service' });
      process.exit(0);
    } catch (error) {
      logger.error({
        message: 'Error during shutdown',
        error: error.message,
        stack: error.stack,
        service: 'presence-service',
      });
      process.exit(1);
    }
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();

module.exports = app;
