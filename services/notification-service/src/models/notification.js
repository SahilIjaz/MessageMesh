const { getConnection } = require('../database/connection');

const createNotification = async (userId, type, title, body, payload = null) => {
  const db = getConnection();
  const [id] = await db('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    payload,
  });

  return db('notifications').where('id', id).first();
};

const getNotifications = async (userId, limit = 50, offset = 0) => {
  const db = getConnection();
  return db('notifications')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
};

const getNotificationCount = async (userId) => {
  const db = getConnection();
  const result = await db('notifications')
    .where('user_id', userId)
    .count('id as total')
    .first();
  return result.total;
};

const markRead = async (notificationId, userId) => {
  const db = getConnection();
  return db('notifications')
    .where({ id: notificationId, user_id: userId })
    .update({ read: true });
};

const markAllRead = async (userId) => {
  const db = getConnection();
  return db('notifications')
    .where('user_id', userId)
    .update({ read: true });
};

const getUnreadCount = async (userId) => {
  const db = getConnection();
  const result = await db('notifications')
    .where({ user_id: userId, read: false })
    .count('id as total')
    .first();
  return result.total;
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationCount,
  markRead,
  markAllRead,
  getUnreadCount,
};
