const { consumeEvent, publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const logger = require('@messagemesh/middleware').logger;
const { deliverToUser } = require('../websocket/ws-server');
const { getRedis } = require('../redis/connection');

const initEventConsumers = async () => {
  try {
    await consumeEvent(eventNames.MESSAGE_SENT, async (event) => {
      try {
        const { messageId, conversationId, senderId, recipientId, timestamp } = event;

        const delivered = deliverToUser(recipientId, {
          type: 'message_delivered',
          messageId,
          conversationId,
          senderId,
          timestamp,
        });

        if (delivered) {
          await publishEvent(eventNames.MESSAGE_DELIVERED, {
            messageId,
            conversationId,
            recipientId,
            timestamp: new Date(),
          });

          logger.info({
            message: 'Real-time message delivery',
            messageId,
            recipientId,
            conversationId,
            service: 'presence-service',
          });
        } else {
          const redis = getRedis();
          const payload = JSON.stringify({
            type: 'message_delivered',
            messageId,
            conversationId,
            senderId,
            timestamp,
          });
          await redis.rPush(`offline_queue:${recipientId}`, payload);
          await redis.lTrim(`offline_queue:${recipientId}`, -100, -1);
          logger.info({
            message: 'Message queued for offline delivery',
            messageId,
            recipientId,
            service: 'presence-service',
          });
        }
      } catch (error) {
        logger.error({
          message: 'Error consuming MESSAGE_SENT event',
          error: error.message,
          stack: error.stack,
          service: 'presence-service',
        });
        throw error;
      }
    }, 'presence-service.message.sent');

    logger.info({ message: 'Event consumers initialized', service: 'presence-service' });
  } catch (error) {
    logger.error({
      message: 'Failed to initialize event consumers',
      error: error.message,
      stack: error.stack,
      service: 'presence-service',
    });
    throw error;
  }
};

module.exports = {
  initEventConsumers,
};
