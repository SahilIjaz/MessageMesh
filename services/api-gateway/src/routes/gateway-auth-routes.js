const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { logger } = require('@messagemesh/middleware');

const router = express.Router();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

router.use(
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { '^/auth': '/auth' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-Request-Id', req.requestId);
    },
    onError: (err, req, res) => {
      logger.error({
        message: 'Auth service proxy error',
        error: err.message,
        requestId: req.requestId,
      });
      res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Auth service temporarily unavailable',
      });
    },
  })
);

module.exports = router;
