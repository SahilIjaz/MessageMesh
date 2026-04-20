const express = require('express');
const { validateJWT } = require('@messagemesh/middleware');
const userController = require('../controllers/user-controller');

const router = express.Router();

// Profile management
router.post('/profile', validateJWT, userController.createProfile);
router.get('/profile', validateJWT, userController.getProfile);
router.put('/profile', validateJWT, userController.updateProfile);

// User search
router.get('/search', validateJWT, userController.searchUsers);

// Connection management
router.post('/connections/request', validateJWT, userController.sendConnectionRequest);
router.post('/connections/accept', validateJWT, userController.acceptConnectionRequest);
router.get('/connections', validateJWT, userController.getConnections);
router.get('/connections/pending', validateJWT, userController.getPendingRequests);
router.post('/connections/block', validateJWT, userController.blockUser);

module.exports = router;
