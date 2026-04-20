const userModel = require('../models/user');
const { crypto, jwt, validators } = require('@messagemesh/utils');
const { AppError } = require('@messagemesh/middleware').errorHandler;
const { publishEvent } = require('@messagemesh/events').eventBus;
const eventNames = require('@messagemesh/events').eventNames;

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email
    if (!validators.isValidEmail(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // Validate password strength
    if (!validators.isValidPassword(password)) {
      throw new AppError(
        'Password must contain uppercase, lowercase, numbers and be at least 8 characters',
        400,
        'WEAK_PASSWORD',
      );
    }

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await crypto.hashPassword(password);

    // Create user
    const user = await userModel.create({
      email,
      passwordHash,
    });

    // Generate tokens
    const accessToken = jwt.signAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = jwt.signRefreshToken({
      userId: user.id,
    });

    // Store refresh token
    await userModel.updateRefreshToken(user.id, refreshToken);

    // Publish event
    await publishEvent(eventNames.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    });

    res.status(201).json({
      userId: user.id,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'AUTH_FAILED');
    }

    // Compare password
    const isPasswordValid = await crypto.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'AUTH_FAILED');
    }

    // Generate tokens
    const accessToken = jwt.signAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = jwt.signRefreshToken({
      userId: user.id,
    });

    // Store refresh token
    await userModel.updateRefreshToken(user.id, refreshToken);

    res.status(200).json({
      userId: user.id,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_TOKEN');
    }

    // Verify refresh token
    const decoded = jwt.verifyToken(refreshToken);
    const user = await userModel.findById(decoded.userId);

    if (!user || user.refresh_token !== refreshToken) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Generate new tokens
    const accessToken = jwt.signAccessToken({
      userId: user.id,
      email: user.email,
    });

    const newRefreshToken = jwt.signRefreshToken({
      userId: user.id,
    });

    // Update refresh token
    await userModel.updateRefreshToken(user.id, newRefreshToken);

    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { userId } = req;

    // Invalidate refresh token
    await userModel.invalidateRefreshToken(userId);

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
