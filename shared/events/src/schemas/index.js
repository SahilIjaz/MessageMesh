const Joi = require('joi');

const schemas = {
  USER_REGISTERED: Joi.object({
    userId: Joi.string().uuid().required(),
    email: Joi.string().email().required(),
    timestamp: Joi.date().required(),
  }),

  USER_PROFILE_CREATED: Joi.object({
    userId: Joi.string().uuid().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    timestamp: Joi.date().required(),
  }),

  CONNECTION_REQUESTED: Joi.object({
    userId: Joi.string().uuid().required(),
    connectedUserId: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),

  CONNECTION_ACCEPTED: Joi.object({
    userId: Joi.string().uuid().required(),
    connectedUserId: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),

  PASSWORD_RESET_REQUESTED: Joi.object({
    userId: Joi.string().uuid().required(),
    email: Joi.string().email().required(),
    resetToken: Joi.string().required(),
    resetUrl: Joi.string().uri().required(),
    expiresAt: Joi.date().required(),
  }),

  USER_BLOCKED: Joi.object({
    blockerId: Joi.string().uuid().required(),
    blockedUserId: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),

  MESSAGE_SENT: Joi.object({
    messageId: Joi.string().uuid().required(),
    conversationId: Joi.string().uuid().required(),
    senderId: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),

  NEW_MESSAGE: Joi.object({
    messageId: Joi.string().uuid().required(),
    conversationId: Joi.string().uuid().required(),
    senderId: Joi.string().uuid().required(),
    recipientIds: Joi.array().items(Joi.string().uuid()).required(),
    contentPreview: Joi.string().max(100).required(),
    timestamp: Joi.date().required(),
  }),

  USER_ONLINE: Joi.object({
    userId: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),

  USER_OFFLINE: Joi.object({
    userId: Joi.string().uuid().required(),
    lastSeen: Joi.date().required(),
  }),

  MESSAGE_DELIVERED: Joi.object({
    messageId: Joi.string().uuid().required(),
    conversationId: Joi.string().uuid().required(),
    recipientId: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),

  MESSAGE_READ: Joi.object({
    messageId: Joi.string().uuid().required(),
    conversationId: Joi.string().uuid().required(),
    readBy: Joi.string().uuid().required(),
    timestamp: Joi.date().required(),
  }),
};

const validateEvent = (eventName, payload) => {
  const schema = schemas[eventName];
  if (!schema) {
    throw new Error(`Unknown event: ${eventName}`);
  }
  return schema.validate(payload, { abortEarly: false });
};

module.exports = {
  ...schemas,
  validateEvent,
};
