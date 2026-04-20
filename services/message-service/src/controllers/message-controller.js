const Joi = require('joi');
const {
  findOrCreateConversation,
  sendMessage,
  getMessageHistory,
  getMessageCount,
  updateMessageStatus,
  getMessage,
  getConversationBetweenUsers,
  getUserConversations,
} = require('../models/message');
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;
const { AppError } = require('@messagemesh/middleware').errorHandler;

const sendMessageSchema = Joi.object({
  recipientId: Joi.string().uuid().required(),
  content: Joi.string().trim().min(1).max(5000).required(),
});

const sendMsg = async (req, res, next) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { recipientId, content } = value;
    const senderId = req.userId;

    if (senderId === recipientId) {
      throw new AppError('Cannot send message to yourself', 400, 'INVALID_RECIPIENT');
    }

    const conversation = await findOrCreateConversation(senderId, recipientId);
    const message = await sendMessage(conversation.id, senderId, content);

    await publishEvent(eventNames.MESSAGE_SENT, {
      messageId: message.id,
      conversationId: conversation.id,
      senderId,
      recipientId,
      content,
      timestamp: new Date(),
    });

    res.status(201).json({
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      content: message.content,
      status: message.status,
      created_at: message.created_at,
      updated_at: message.updated_at,
    });
  } catch (err) {
    next(err);
  }
};

const getHistorySchema = Joi.object({
  recipientId: Joi.string().uuid().required(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

const getHistory = async (req, res, next) => {
  try {
    const { error, value } = getHistorySchema.validate(req.query);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { recipientId, limit, offset } = value;
    const userId = req.userId;

    const conversation = await getConversationBetweenUsers(userId, recipientId);
    if (!conversation) {
      return res.status(200).json({
        data: [],
        limit,
        offset,
        total: 0,
      });
    }

    const messages = await getMessageHistory(conversation.id, limit, offset);
    const total = await getMessageCount(conversation.id);

    res.status(200).json({
      data: messages.map((msg) => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        status: msg.status,
        delivered_at: msg.delivered_at,
        read_at: msg.read_at,
        created_at: msg.created_at,
      })),
      limit,
      offset,
      total,
    });
  } catch (err) {
    next(err);
  }
};

const updateStatusSchema = Joi.object({
  messageId: Joi.string().uuid().required(),
  status: Joi.string().valid('delivered', 'read').required(),
});

const updateStatus = async (req, res, next) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const { messageId, status } = value;
    const userId = req.userId;

    const message = await getMessage(messageId);
    if (!message) {
      throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    if (message.sender_id === userId) {
      throw new AppError('Cannot update status of your own message', 400, 'INVALID_STATUS_UPDATE');
    }

    await updateMessageStatus(messageId, status);

    if (status === 'delivered') {
      await publishEvent(eventNames.MESSAGE_DELIVERED, {
        messageId,
        conversationId: message.conversation_id,
        recipientId: userId,
        timestamp: new Date(),
      });
    } else {
      await publishEvent(eventNames.MESSAGE_READ, {
        messageId,
        conversationId: message.conversation_id,
        readBy: userId,
        timestamp: new Date(),
      });
    }

    res.status(200).json({ status: 'updated' });
  } catch (err) {
    next(err);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const conversations = await getUserConversations(req.userId, limit, offset);

    res.status(200).json({
      data: conversations.map((conv) => ({
        id: conv.id,
        user_id_1: conv.user_id_1,
        user_id_2: conv.user_id_2,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
      })),
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendMsg,
  getHistory,
  updateStatus,
  getConversations,
};
