const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      code: 'MISSING_TOKEN',
      message: 'Authorization token is required',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    const statusCode = error.name === 'TokenExpiredError' ? 401 : 403;
    const message = error.name === 'TokenExpiredError'
      ? 'Token has expired'
      : 'Invalid token';

    return res.status(statusCode).json({
      code: 'INVALID_TOKEN',
      message,
    });
  }
};

const validateOptionalJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;
  } catch (error) {
    // Silently ignore invalid optional tokens
  }

  next();
};

module.exports = validateJWT;
module.exports.validateOptionalJWT = validateOptionalJWT;
