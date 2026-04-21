const nodemailer = require('nodemailer');
const { consumeEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const logger = require('@messagemesh/middleware').logger;
const { createNotification } = require('../models/notification');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT, 10) || 1025,
  secure: false,
});

const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: 'noreply@messagemesh.app',
      to,
      subject,
      text,
    });
  } catch (error) {
    logger.error({
      message: 'Failed to send email',
      error: error.message,
      service: 'notification-service',
    });
  }
};

const initEventConsumers = async () => {
  try {
    await consumeEvent(eventNames.NEW_MESSAGE, async (event) => {
      try {
        const { messageId, conversationId, senderId, recipientIds, contentPreview, timestamp } = event;

        for (const recipientId of recipientIds) {
          await createNotification(
            recipientId,
            'new_message',
            'New Message',
            contentPreview,
            event
          );
        }

        logger.info({
          message: 'New message notification sent',
          messageId,
          recipientCount: recipientIds.length,
          service: 'notification-service',
        });
      } catch (error) {
        logger.error({
          message: 'Error consuming NEW_MESSAGE event',
          error: error.message,
          stack: error.stack,
          service: 'notification-service',
        });
        throw error;
      }
    }, 'notification-service.message.new');

    await consumeEvent(eventNames.GROUP_MESSAGE_SENT, async (event) => {
      try {
        const { messageId, groupId, senderId, memberIds, contentPreview, timestamp } = event;

        for (const memberId of memberIds) {
          if (memberId !== senderId) {
            await createNotification(
              memberId,
              'group_message',
              'New Group Message',
              contentPreview,
              event
            );
          }
        }

        logger.info({
          message: 'Group message notification sent',
          messageId,
          groupId,
          recipientCount: memberIds.length - 1,
          service: 'notification-service',
        });
      } catch (error) {
        logger.error({
          message: 'Error consuming GROUP_MESSAGE_SENT event',
          error: error.message,
          stack: error.stack,
          service: 'notification-service',
        });
        throw error;
      }
    }, 'notification-service.group.message_sent');

    await consumeEvent(eventNames.MESSAGE_DELIVERED, async (event) => {
      try {
        const { messageId, conversationId, recipientId, timestamp } = event;

        await createNotification(
          recipientId,
          'delivered',
          'Message Delivered',
          'Your message was delivered',
          event
        );

        logger.info({
          message: 'Delivery receipt notification created',
          messageId,
          recipientId,
          service: 'notification-service',
        });
      } catch (error) {
        logger.error({
          message: 'Error consuming MESSAGE_DELIVERED event',
          error: error.message,
          stack: error.stack,
          service: 'notification-service',
        });
        throw error;
      }
    }, 'notification-service.message.delivered');

    await consumeEvent(eventNames.MESSAGE_READ, async (event) => {
      try {
        const { messageId, conversationId, readBy, timestamp } = event;

        await createNotification(
          readBy,
          'read',
          'Message Marked as Read',
          'You marked a message as read',
          event
        );

        logger.info({
          message: 'Read receipt notification created',
          messageId,
          readBy,
          service: 'notification-service',
        });
      } catch (error) {
        logger.error({
          message: 'Error consuming MESSAGE_READ event',
          error: error.message,
          stack: error.stack,
          service: 'notification-service',
        });
        throw error;
      }
    }, 'notification-service.message.read');

    logger.info({ message: 'Event consumers initialized', service: 'notification-service' });
  } catch (error) {
    logger.error({
      message: 'Failed to initialize event consumers',
      error: error.message,
      stack: error.stack,
      service: 'notification-service',
    });
    throw error;
  }
};

module.exports = {
  initEventConsumers,
};
