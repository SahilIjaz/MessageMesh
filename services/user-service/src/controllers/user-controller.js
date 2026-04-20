const Joi = require('joi');
const userProfileModel = require('../models/user-profile');
const userConnectionModel = require('../models/user-connection');
const { AppError } = require('@messagemesh/middleware').errorHandler;
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;

const createProfile = async (req, res, next) => {
  try {
    const { userId } = req;
    const { firstName, lastName, email, bio, phone, avatarUrl } = req.body;

    const schema = Joi.object({
      firstName: Joi.string().min(1).max(100).required(),
      lastName: Joi.string().min(1).max(100).required(),
      email: Joi.string().email().required(),
      bio: Joi.string().max(500).optional(),
      phone: Joi.string().optional(),
      avatarUrl: Joi.string().uri().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const existingProfile = await userProfileModel.findByUserId(userId);
    if (existingProfile) {
      throw new AppError('User profile already exists', 409, 'PROFILE_EXISTS');
    }

    const profile = await userProfileModel.create({
      userId,
      firstName,
      lastName,
      email,
      bio,
      phone,
      avatarUrl,
    });

    await publishEvent(eventNames.USER_PROFILE_CREATED, {
      userId,
      firstName,
      lastName,
      timestamp: new Date(),
    });

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const { userId } = req;

    const profile = await userProfileModel.findByUserId(userId);
    if (!profile) {
      throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { userId } = req;

    const schema = Joi.object({
      firstName: Joi.string().min(1).max(100).optional(),
      lastName: Joi.string().min(1).max(100).optional(),
      bio: Joi.string().max(500).allow(null).optional(),
      phone: Joi.string().optional(),
      avatarUrl: Joi.string().uri().allow(null).optional(),
      preferences: Joi.object().optional(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const profile = await userProfileModel.update(userId, req.body);
    if (!profile) {
      throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q || q.trim().length < 2) {
      throw new AppError('Search query must be at least 2 characters', 400, 'INVALID_QUERY');
    }

    const users = await userProfileModel.search(q.trim(), parseInt(limit), parseInt(offset));

    res.status(200).json({
      data: users,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

const sendConnectionRequest = async (req, res, next) => {
  try {
    const { userId } = req;
    const { connectedUserId } = req.body;

    const schema = Joi.object({
      connectedUserId: Joi.string().uuid().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    if (userId === connectedUserId) {
      throw new AppError('Cannot connect with yourself', 400, 'INVALID_REQUEST');
    }

    const targetUser = await userProfileModel.findByUserId(connectedUserId);
    if (!targetUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isBlocked = await userConnectionModel.isBlocked(userId, connectedUserId);
    if (isBlocked) {
      throw new AppError('You cannot connect with this user', 403, 'BLOCKED');
    }

    const isAlreadyConnected = await userConnectionModel.isConnected(userId, connectedUserId);
    if (isAlreadyConnected) {
      throw new AppError('Already connected with this user', 409, 'ALREADY_CONNECTED');
    }

    const connection = await userConnectionModel.sendRequest(userId, connectedUserId);

    await publishEvent(eventNames.CONNECTION_REQUESTED, {
      userId,
      connectedUserId,
      timestamp: new Date(),
    });

    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
};

const acceptConnectionRequest = async (req, res, next) => {
  try {
    const { userId } = req;
    const { connectedUserId } = req.body;

    const schema = Joi.object({
      connectedUserId: Joi.string().uuid().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    const connection = await userConnectionModel.acceptRequest(userId, connectedUserId);
    if (!connection) {
      throw new AppError('Connection request not found', 404, 'REQUEST_NOT_FOUND');
    }

    await publishEvent(eventNames.CONNECTION_ACCEPTED, {
      userId,
      connectedUserId,
      timestamp: new Date(),
    });

    res.status(200).json(connection);
  } catch (error) {
    next(error);
  }
};

const getConnections = async (req, res, next) => {
  try {
    const { userId } = req;
    const { status = 'accepted', limit = 50, offset = 0 } = req.query;

    const connections = await userConnectionModel.getConnections(
      userId,
      status,
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      data: connections,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

const getPendingRequests = async (req, res, next) => {
  try {
    const { userId } = req;
    const { limit = 50, offset = 0 } = req.query;

    const requests = await userConnectionModel.getPendingRequests(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      data: requests,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const { userId } = req;
    const { blockedUserId } = req.body;

    const schema = Joi.object({
      blockedUserId: Joi.string().uuid().required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
    }

    if (userId === blockedUserId) {
      throw new AppError('Cannot block yourself', 400, 'INVALID_REQUEST');
    }

    const connection = await userConnectionModel.blockUser(userId, blockedUserId);

    await publishEvent(eventNames.USER_BLOCKED, {
      userId,
      blockedUserId,
      timestamp: new Date(),
    });

    res.status(200).json(connection || { status: 'blocked' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  getProfile,
  updateProfile,
  searchUsers,
  sendConnectionRequest,
  acceptConnectionRequest,
  getConnections,
  getPendingRequests,
  blockUser,
};
