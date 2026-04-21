const { consumeEvent, publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const logger = require('@messagemesh/middleware').logger;
const { deliverToUser } = require('../websocket/ws-server');

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
