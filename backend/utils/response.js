/**
 * Response Formatter
 * Standardized response format for all API endpoints
 */

const { HTTP_STATUS } = require('../config/constants');

/**
 * Format success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 * @returns {Object} Formatted response
 */
const successResponse = (data = null, message = 'Success', status = HTTP_STATUS.OK) => ({
  success: true,
  status,
  data,
  message,
  timestamp: new Date().toISOString(),
});

/**
 * Format error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
const errorResponse = (
  code = 'INTERNAL_SERVER_ERROR',
  message = 'An error occurred',
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details = null
) => ({
  success: false,
  status,
  error: {
    code,
    message,
    ...(details && { details }),
  },
  timestamp: new Date().toISOString(),
});

/**
 * Format paginated response
 * @param {Array} data - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 * @returns {Object} Formatted paginated response
 */
const paginatedResponse = (
  data = [],
  page = 1,
  limit = 20,
  total = 0,
  message = 'Success'
) => {
  const pages = Math.ceil(total / limit);

  return {
    success: true,
    status: HTTP_STATUS.OK,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    },
    message,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Format validation error response
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Formatted validation error response
 */
const validationErrorResponse = (errors = []) => {
  const formattedErrors = errors.map((error) => ({
    field: error.param || error.path,
    message: error.msg || error.message,
    value: error.value,
  }));

  return errorResponse(
    'VALIDATION_ERROR',
    'Input validation failed',
    HTTP_STATUS.BAD_REQUEST,
    {
      errors: formattedErrors,
      count: formattedErrors.length,
    }
  );
};

/**
 * Send success response via Express response object
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 */
const sendSuccess = (
  res,
  data = null,
  message = 'Success',
  status = HTTP_STATUS.OK
) => {
  res.status(status).json(successResponse(data, message, status));
};

/**
 * Send error response via Express response object
 * @param {Object} res - Express response object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Object} details - Additional error details
 */
const sendError = (
  res,
  code = 'INTERNAL_SERVER_ERROR',
  message = 'An error occurred',
  status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details = null
) => {
  res.status(status).json(errorResponse(code, message, status, details));
};

/**
 * Send paginated response via Express response object
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 */
const sendPaginated = (
  res,
  data = [],
  page = 1,
  limit = 20,
  total = 0,
  message = 'Success'
) => {
  res.status(HTTP_STATUS.OK).json(paginatedResponse(data, page, limit, total, message));
};

/**
 * Format cursor paginated response
 */
const cursorPaginatedResponse = (
  data = [],
  nextCursor = null,
  hasMore = false,
  limit = 20,
  message = 'Success'
) => ({
  success: true,
  status: HTTP_STATUS.OK,
  data,
  pagination: {
    nextCursor,
    hasMore,
    limit,
  },
  message,
  timestamp: new Date().toISOString(),
});

/**
 * Send cursor paginated response via Express response object
 */
const sendCursorPaginated = (
  res,
  data = [],
  nextCursor = null,
  hasMore = false,
  limit = 20,
  message = 'Success'
) => {
  res.status(HTTP_STATUS.OK).json(cursorPaginatedResponse(data, nextCursor, hasMore, limit, message));
};

/**
 * Send validation error response via Express response object
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
const sendValidationError = (res, errors = []) => {
  res.status(HTTP_STATUS.BAD_REQUEST).json(validationErrorResponse(errors));
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  cursorPaginatedResponse,
  validationErrorResponse,
  sendSuccess,
  sendError,
  sendPaginated,
  sendCursorPaginated,
  sendValidationError,
};
