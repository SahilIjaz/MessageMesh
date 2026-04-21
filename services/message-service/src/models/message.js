const { getConnection } = require('../database/connection');

const findOrCreateConversation = async (userId1, userId2) => {
  const db = getConnection();
  const [user1, user2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  let conversation = await db('conversations')
    .where({ user_id_1: user1, user_id_2: user2 })
    .first();

  if (!conversation) {
    const [id] = await db('conversations').insert({
      user_id_1: user1,
      user_id_2: user2,
    });
    conversation = { id, user_id_1: user1, user_id_2: user2 };
  }

  return conversation;
};

const getConversation = async (conversationId) => {
  const db = getConnection();
  return db('conversations').where('id', conversationId).first();
};

const sendMessage = async (conversationId, senderId, content) => {
  const db = getConnection();
  const [id] = await db('messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content,
  });

  return db('messages').where('id', id).first();
};

const getMessageHistory = async (conversationId, limit = 50, offset = 0) => {
  const db = getConnection();
  return db('messages')
    .where('conversation_id', conversationId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const getMessageCount = async (conversationId) => {
  const db = getConnection();
  const result = await db('messages')
    .where('conversation_id', conversationId)
    .count('* as total')
    .first();
  return result.total;
};

const updateMessageStatus = async (messageId, status, timestamp = new Date()) => {
  const db = getConnection();
  const updateData = { status, updated_at: new Date() };

  if (status === 'delivered') {
    updateData.delivered_at = timestamp;
  } else if (status === 'read') {
    updateData.read_at = timestamp;
  }

  return db('messages').where('id', messageId).update(updateData);
};

const getMessage = async (messageId) => {
  const db = getConnection();
  return db('messages').where('id', messageId).first();
};

const getConversationBetweenUsers = async (userId1, userId2) => {
  const db = getConnection();
  const [user1, user2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
  return db('conversations')
    .where({ user_id_1: user1, user_id_2: user2 })
    .first();
};

const getUserConversations = async (userId, limit = 50, offset = 0) => {
  const db = getConnection();
  return db('conversations')
    .where((builder) => {
      builder.where('user_id_1', userId).orWhere('user_id_2', userId);
    })
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const getUndeliveredMessages = async (recipientId, limit = 50) => {
  const db = getConnection();
  return db('messages')
    .join('conversations', 'messages.conversation_id', 'conversations.id')
    .where('messages.status', 'sent')
    .where((builder) => {
      builder.where('conversations.user_id_1', recipientId)
          .orWhere('conversations.user_id_2', recipientId);
    })
    .whereNot('messages.sender_id', recipientId)
    .orderBy('messages.created_at', 'asc')
    .limit(limit)
    .select('messages.*');
};

module.exports = {
  findOrCreateConversation,
  getConversation,
  sendMessage,
  getMessageHistory,
  getMessageCount,
  updateMessageStatus,
  getMessage,
  getConversationBetweenUsers,
  getUserConversations,
  getUndeliveredMessages,
};
