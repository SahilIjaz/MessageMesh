const express = require('express');
const controller = require('../controllers/notification-controller');

const router = express.Router();

router.get('/unread-count', controller.getUnreadCount);
router.get('/', controller.getNotifications);
router.patch('/read-all', controller.markAllNotificationsRead);
router.patch('/:notificationId/read', controller.markNotificationRead);

module.exports = router;
