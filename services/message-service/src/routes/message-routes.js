const express = require('express');
const controller = require('../controllers/message-controller');

const router = express.Router();

router.post('/send', controller.sendMsg);
router.get('/history', controller.getHistory);
router.put('/status', controller.updateStatus);
router.patch('/:messageId/read', controller.markMessageRead);
router.get('/conversations', controller.getConversations);

module.exports = router;
