const WebSocket = require('ws');
const { getRedis } = require('../redis/connection');
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const logger = require('@messagemesh/middleware').logger;

let wsServer = null;
const connectionRegistry = new Map(); // Map<userId, WebSocket>

const initWsServer = (httpServer) => {
  wsServer = new WebSocket.Server({ noServer: true });

  httpServer.on('upgrade', async (request, socket, head) => {
    const userId = request.headers['x-user-id'];

    if (!userId) {
      logger.warn({ message: 'WebSocket upgrade rejected: missing X-User-Id header', service: 'presence-service' });
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, async (ws) => {
      try {
        await handleConnect(ws, userId);
      } catch (error) {
        logger.error({ message: 'Error handling WebSocket connection', error: error.message, stack: error.stack, service: 'presence-service' });
        ws.close(1011, 'Internal server error');
      }
    });
  });

  // Phantom connection detector — every 60s check for expired TTL
  setInterval(async () => {
    const redis = getRedis();
    for (const [userId, ws] of connectionRegistry) {
      if (ws.readyState !== WebSocket.OPEN) {
        connectionRegistry.delete(userId);
        continue;
      }
      const alive = await redis.get(`presence:${userId}`);
      if (!alive) {
        logger.warn({ message: 'Phantom connection detected, terminating', userId, service: 'presence-service' });
        ws.terminate();
      }
    }
  }, 60000);

  logger.info({ message: 'WebSocket server initialized', service: 'presence-service' });
};

const broadcastToAll = (data, exceptUserId = null) => {
  const payload = JSON.stringify(data);
  for (const [uid, socket] of connectionRegistry) {
    if (uid !== exceptUserId && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  }
};

const handleConnect = async (ws, userId) => {
  connectionRegistry.set(userId, ws);
  const redis = getRedis();

  const now = new Date();
  await redis.set(`presence:${userId}`, '1', { EX: 300 });
  await redis.set(`presence:lastseen:${userId}`, now.toISOString());

  await publishEvent(eventNames.USER_ONLINE, {
    userId,
    timestamp: now,
  });

  logger.info({ message: 'User connected', userId, service: 'presence-service' });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(ws, userId, message);
    } catch (error) {
      logger.error({ message: 'Error processing WebSocket message', userId, error: error.message, stack: error.stack, service: 'presence-service' });
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', async () => {
    try {
      connectionRegistry.delete(userId);
      await redis.del(`presence:${userId}`);
      const lastSeen = new Date().toISOString();
      await redis.set(`presence:lastseen:${userId}`, lastSeen);

      await publishEvent(eventNames.USER_OFFLINE, {
        userId,
        lastSeen: new Date(lastSeen),
      });

      logger.info({ message: 'User disconnected', userId, service: 'presence-service' });
    } catch (error) {
      logger.error({ message: 'Error handling WebSocket close', userId, error: error.message, stack: error.stack, service: 'presence-service' });
    }
  });

  ws.on('error', (error) => {
    logger.error({ message: 'WebSocket error', userId, error: error.message, stack: error.stack, service: 'presence-service' });
  });
};

const handleMessage = async (ws, userId, message) => {
  const redis = getRedis();
  const { type, recipientId, conversationId } = message;

  switch (type) {
    case 'heartbeat': {
      ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
      await redis.set(`presence:${userId}`, '1', { EX: 300 });
      break;
    }

    case 'typing_start': {
      if (!recipientId || !conversationId) {
        throw new Error('typing_start requires recipientId and conversationId');
      }

      const typingKey = `typing:${userId}:${conversationId}`;
      await redis.set(typingKey, '1', { EX: 10 });

      deliverToUser(recipientId, {
        type: 'typing_start',
        senderId: userId,
        conversationId,
      });
      break;
    }

    case 'typing_stop': {
      if (!recipientId || !conversationId) {
        throw new Error('typing_stop requires recipientId and conversationId');
      }

      const typingKey = `typing:${userId}:${conversationId}`;
      await redis.del(typingKey);

      deliverToUser(recipientId, {
        type: 'typing_stop',
        senderId: userId,
        conversationId,
      });
      break;
    }

    default: {
      logger.warn({ message: 'Unknown WebSocket message type', userId, type, service: 'presence-service' });
    }
  }
};

const deliverToUser = (userId, data) => {
  const ws = connectionRegistry.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
};

const isOnline = (userId) => {
  const ws = connectionRegistry.get(userId);
  return ws && ws.readyState === WebSocket.OPEN;
};

const getConnectionCount = () => {
  return connectionRegistry.size;
};

module.exports = {
  initWsServer,
  deliverToUser,
  isOnline,
  getConnectionCount,
};
