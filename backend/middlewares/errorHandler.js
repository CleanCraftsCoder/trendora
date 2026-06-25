/**
 * Error Handler Middleware
 * Centralized error handling for all routes
 */

const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Should be used as the last middleware in Express app
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Default error object
  let error = {
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details: null,
  };

  // Log error
  logger.logError('Error caught by global handler', err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const messages = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');

    error = {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: messages,
      status: HTTP_STATUS.BAD_REQUEST,
      details: { field: Object.keys(err.errors)[0] },
    };
  } else if (err.name === 'CastError') {
    // MongoDB Cast error
    error = {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: `Invalid ${err.kind}`,
      status: HTTP_STATUS.BAD_REQUEST,
      details: { field: err.path },
    };
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyValue)[0];
    error = {
      code: ERROR_CODES.CONFLICT,
      message: `${field} already exists`,
      status: HTTP_STATUS.CONFLICT,
      details: { field },
    };
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    error = {
      code: ERROR_CODES.INVALID_TOKEN,
      message: 'Invalid token',
      status: HTTP_STATUS.UNAUTHORIZED,
    };
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired error
    error = {
      code: ERROR_CODES.TOKEN_EXPIRED,
      message: 'Token expired',
      status: HTTP_STATUS.UNAUTHORIZED,
    };
  } else if (err.status) {
    // Custom error with status
    error = {
      code: err.code || ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: err.message,
      status: err.status,
      details: err.details || null,
    };
  }

  // Send error response
  res.status(error.status).json(
    errorResponse(error.code, error.message, error.status, error.details)
  );
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create custom error
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {string} code - Error code
 * @param {Object} details - Additional details
 * @returns {Error} Custom error object
 */
const createError = (
  message = 'An error occurred',
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code = ERROR_CODES.INTERNAL_SERVER_ERROR,
  details = null
) => {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Common error creators
 */
const errors = {
  // 400 Bad Request
  badRequest: (message = 'Bad request', details = null) =>
    createError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details),

  // 401 Unauthorized
  unauthorized: (message = 'Unauthorized', details = null) =>
    createError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, details),

  // 403 Forbidden
  forbidden: (message = 'Forbidden', details = null) =>
    createError(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, details),

  // 404 Not Found
  notFound: (message = 'Resource not found', details = null) =>
    createError(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, details),

  // 409 Conflict
  conflict: (message = 'Resource already exists', details = null) =>
    createError(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, details),

  // 429 Rate Limit Exceeded
  rateLimitExceeded: (message = 'Too many requests', details = null) =>
    createError(
      message,
      HTTP_STATUS.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      details
    ),

  // 500 Internal Server Error
  internalServerError: (message = 'Internal server error', details = null) =>
    createError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      details
    ),

  // Database Error
  databaseError: (message = 'Database error', details = null) =>
    createError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.DATABASE_ERROR,
      details
    ),

  // Validation Error
  validationError: (message = 'Validation failed', details = null) =>
    createError(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details),

  // Token Error
  tokenExpired: (message = 'Token expired', details = null) =>
    createError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_EXPIRED, details),

  invalidToken: (message = 'Invalid token', details = null) =>
    createError(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_TOKEN, details),
};

module.exports = {
  errorHandler,
  asyncHandler,
  createError,
  errors,
};
