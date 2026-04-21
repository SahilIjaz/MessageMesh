require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { errorHandler, requestIdMiddleware, rateLimiter } = require('@messagemesh/middleware');
const { logger } = require('@messagemesh/middleware');
const authRoutes = require('./routes/gateway-auth-routes');
const { validateJWT } = require('@messagemesh/middleware');

const app = express();
const PORT = process.env.PORT || 3000;

const SERVICE_URLS = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  USER: process.env.USER_SERVICE_URL || 'http://user-service:3002',
  MESSAGE: process.env.MESSAGE_SERVICE_URL || 'http://message-service:3003',
  PRESENCE: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3004',
  NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005',
  MEDIA: process.env.MEDIA_SERVICE_URL || 'http://media-service:3006',
  GROUP_CHAT: process.env.GROUP_CHAT_SERVICE_URL || 'http://group-chat-service:3007',
};

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(requestIdMiddleware);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials: true,
}));
app.use(rateLimiter({ maxRequests: 100, windowSeconds: 60 }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (local handling)
app.use('/auth', authRoutes);

// Protected routes require JWT
app.use('/users', validateJWT, createProxyMiddleware({
  target: SERVICE_URLS.USER,
  changeOrigin: true,
  pathRewrite: { '^/users': '' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-User-Id', req.userId);
    proxyReq.setHeader('X-Request-Id', req.requestId);
  },
  onError: (err, req, res) => {
    logger.error({
      message: 'User service proxy error',
      error: err.message,
      requestId: req.requestId,
    });
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'User service temporarily unavailable',
    });
  },
}));

app.use('/messages', validateJWT, createProxyMiddleware({
  target: SERVICE_URLS.MESSAGE,
  changeOrigin: true,
  pathRewrite: { '^/messages': '' },
  ws: true,
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-User-Id', req.userId);
    proxyReq.setHeader('X-Request-Id', req.requestId);
  },
  onError: (err, req, res) => {
    logger.error({
      message: 'Message service proxy error',
      error: err.message,
      requestId: req.requestId,
    });
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Message service temporarily unavailable',
    });
  },
}));

app.use('/presence', validateJWT, createProxyMiddleware({
  target: SERVICE_URLS.PRESENCE,
  changeOrigin: true,
  pathRewrite: { '^/presence': '' },
  ws: true,
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-User-Id', req.userId);
    proxyReq.setHeader('X-Request-Id', req.requestId);
  },
  onError: (err, req, res) => {
    logger.error({
      message: 'Presence service proxy error',
      error: err.message,
      requestId: req.requestId,
    });
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Presence service temporarily unavailable',
    });
  },
}));

app.use('/notifications', validateJWT, createProxyMiddleware({
  target: SERVICE_URLS.NOTIFICATION,
  changeOrigin: true,
  pathRewrite: { '^/notifications': '' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-User-Id', req.userId);
    proxyReq.setHeader('X-Request-Id', req.requestId);
  },
  onError: (err, req, res) => {
    logger.error({
      message: 'Notification service proxy error',
      error: err.message,
      requestId: req.requestId,
    });
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Notification service temporarily unavailable',
    });
  },
}));

app.use('/media', validateJWT, createProxyMiddleware({
  target: SERVICE_URLS.MEDIA,
  changeOrigin: true,
  pathRewrite: { '^/media': '' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-User-Id', req.userId);
    proxyReq.setHeader('X-Request-Id', req.requestId);
  },
  onError: (err, req, res) => {
    logger.error({
      message: 'Media service proxy error',
      error: err.message,
      requestId: req.requestId,
    });
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Media service temporarily unavailable',
    });
  },
}));

app.use('/groups', validateJWT, createProxyMiddleware({
  target: SERVICE_URLS.GROUP_CHAT,
  changeOrigin: true,
  pathRewrite: { '^/groups': '' },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-User-Id', req.userId);
    proxyReq.setHeader('X-Request-Id', req.requestId);
  },
  onError: (err, req, res) => {
    logger.error({
      message: 'Group chat service proxy error',
      error: err.message,
      requestId: req.requestId,
    });
    res.status(503).json({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Group chat service temporarily unavailable',
    });
  },
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Endpoint not found',
  });
});

// Error handler
app.use(errorHandler);

const startGateway = async () => {
  try {
    app.listen(PORT, () => {
      logger.info({
        message: `API Gateway running on port ${PORT}`,
        service: 'api-gateway',
        port: PORT,
      });
    });
  } catch (error) {
    logger.error({
      message: 'Failed to start API Gateway',
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  logger.info({
    message: 'SIGTERM signal received: closing HTTP server',
    service: 'api-gateway',
  });
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info({
    message: 'SIGINT signal received: closing HTTP server',
    service: 'api-gateway',
  });
  process.exit(0);
});

startGateway();

module.exports = app;
