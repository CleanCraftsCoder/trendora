/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const User = require('../models/User');
const { errors } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Generate Access Token
 * @param {string} userId - User ID
 * @returns {string} JWT access token
 */
const generateAccessToken = (userId) => {
  const payload = {
    userId,
    type: 'access',
  };

  const expiryTime = config.JWT_ACCESS_EXPIRY || '15m';

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: expiryTime,
    issuer: 'trendora-api',
    audience: 'trendora-client',
  });
};

/**
 * Generate Refresh Token
 * @param {string} userId - User ID
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (userId) => {
  const payload = {
    userId,
    type: 'refresh',
  };

  const expiryTime = config.JWT_REFRESH_EXPIRY || '7d';

  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: expiryTime,
    issuer: 'trendora-api',
    audience: 'trendora-client',
  });
};

/**
 * Generate both tokens
 * @param {string} userId - User ID
 * @returns {Object} Object with accessToken and refreshToken
 */
const generateTokens = (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  };
};

/**
 * Middleware to authenticate JWT token
 * Extracts token from Authorization header and verifies it
 * Sets req.user with decoded token data
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.logAuthEvent('authentication_failed', null, false, {
        reason: 'missing_token',
        url: req.originalUrl,
      });

      return next(errors.unauthorized('Missing or invalid authorization header'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Check if token is access token
    if (decoded.type !== 'access') {
      logger.logAuthEvent('authentication_failed', decoded.userId, false, {
        reason: 'invalid_token_type',
      });

      return next(errors.unauthorized('Invalid token type'));
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      logger.logAuthEvent('authentication_failed', decoded.userId, false, {
        reason: 'user_not_found',
      });

      return next(errors.unauthorized('User not found'));
    }

    // Attach user to request
    req.user = {
      id: user._id,
      email: user.email,
      username: user.username,
    };

    logger.logAuthEvent('authentication_success', user._id, true, {
      method: 'jwt',
    });

    next();
  } catch (error) {
    logger.logAuthEvent('authentication_failed', null, false, {
      reason: error.message,
      url: req.originalUrl,
    });

    if (error.message === 'Token expired') {
      return next(errors.tokenExpired('Your session has expired'));
    }

    if (error.message === 'Invalid token') {
      return next(errors.invalidToken('Invalid or malformed token'));
    }

    next(errors.unauthorized('Authentication failed'));
  }
};

/**
 * Middleware to verify refresh token and refresh access token
 * Used in refresh endpoint to generate new access token
 */
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(errors.badRequest('Refresh token is required'));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.logAuthEvent('refresh_token_failed', null, false, {
          reason: 'refresh_token_expired',
        });
        return next(errors.tokenExpired('Refresh token expired. Please login again.'));
      }

      logger.logAuthEvent('refresh_token_failed', null, false, {
        reason: 'invalid_refresh_token',
      });
      return next(errors.invalidToken('Invalid refresh token'));
    }

    // Check if token is refresh token
    if (decoded.type !== 'refresh') {
      return next(errors.unauthorized('Invalid token type'));
    }

    // Verify user exists
    const user = await User.findById(decoded.userId);

    if (!user) {
      logger.logAuthEvent('refresh_token_failed', decoded.userId, false, {
        reason: 'user_not_found',
      });

      return next(errors.unauthorized('User not found'));
    }

    // Attach user and token to request
    req.user = {
      id: user._id,
      email: user.email,
      username: user.username,
    };
    req.refreshToken = refreshToken;

    logger.logAuthEvent('refresh_token_success', user._id, true);

    next();
  } catch (error) {
    logger.logError('Refresh token authentication error', error);
    next(errors.unauthorized('Token refresh failed'));
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if token is missing
 * Useful for public endpoints that have optional authentication
 */
const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);

    if (decoded.type !== 'access') {
      // Invalid token type, continue without authentication
      return next();
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (user) {
      // Attach user to request if found
      req.user = {
        id: user._id,
        email: user.email,
        username: user.username,
      };
    }

    next();
  } catch (error) {
    // If token verification fails, continue without authentication
    next();
  }
};

/**
 * Check if user is authenticated
 * For use in custom logic
 * @param {Object} req - Express request object
 * @returns {boolean} Whether user is authenticated
 */
const isAuthenticated = (req) => {
  return !!req.user;
};

module.exports = {
  authenticate,
  authenticateRefreshToken,
  authenticateOptional,
  isAuthenticated,
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
};
