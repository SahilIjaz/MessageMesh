const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const signAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

const getTokenExpiry = (token) => {
  const decoded = jwt.decode(token);
  return new Date(decoded.exp * 1000);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  decodeToken,
  getTokenExpiry,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};
