const express = require('express');
const controller = require('../controllers/group-controller');

const router = express.Router();

router.post('/', controller.createGroup);
router.get('/', controller.getGroups);
router.get('/:groupId', controller.getGroup);
router.post('/:groupId/members', controller.addMember);
router.delete('/:groupId/members/:userId', controller.removeMember);
router.post('/:groupId/messages', controller.sendGroupMessage);
router.get('/:groupId/messages', controller.getGroupMessages);

module.exports = router;
