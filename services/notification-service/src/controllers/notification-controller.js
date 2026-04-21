const { AppError } = require('@messagemesh/middleware').errorHandler;
const logger = require('@messagemesh/middleware').logger;
const {
  getNotifications,
  getNotificationCount,
  markRead,
  markAllRead,
  getUnreadCount,
} = require('../models/notification');

const getNotificationsHandler = async (req, res, next) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;

    const notifications = await getNotifications(userId, limit, offset);
    const total = await getNotificationCount(userId);
    const unreadCount = await getUnreadCount(userId);

    res.status(200).json({
      data: notifications,
      limit,
      offset,
      total,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationReadHandler = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const rowsUpdated = await markRead(notificationId, userId);

    if (rowsUpdated === 0) {
      throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsReadHandler = async (req, res, next) => {
  try {
    const userId = req.userId;
    await markAllRead(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

const getUnreadCountHandler = async (req, res, next) => {
  try {
    const userId = req.userId;
    const count = await getUnreadCount(userId);
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications: getNotificationsHandler,
  markNotificationRead: markNotificationReadHandler,
  markAllNotificationsRead: markAllNotificationsReadHandler,
  getUnreadCount: getUnreadCountHandler,
};
