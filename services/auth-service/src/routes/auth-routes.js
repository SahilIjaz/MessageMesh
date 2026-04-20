const express = require('express');
const Joi = require('joi');
const { validateRequest } = require('@messagemesh/middleware');
const { validateJWT } = require('@messagemesh/middleware');
const authController = require('../controllers/auth-controller');

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshSchema), authController.refresh);
router.post('/logout', validateJWT, authController.logout);

module.exports = router;
