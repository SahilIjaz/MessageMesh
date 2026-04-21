const express = require('express');
const controller = require('../controllers/presence-controller');

const router = express.Router();

router.get('/status/online', controller.getOnlineList);
router.get('/status/:userId', controller.getStatus);
router.get('/status', controller.getBatchStatus);

module.exports = router;
