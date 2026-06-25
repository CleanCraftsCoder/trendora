/**
 * Winston Logger Configuration
 * Centralized logging system for the application
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/environment');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../', config.LOG_DIR);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

/**
 * Create logger instance
 */
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: customFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, config.LOG_FILE),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Log HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in ms
 */
logger.logHttpRequest = (req, res, responseTime) => {
  const { method, url, headers } = req;
  const { statusCode } = res;

  logger.info(`${method} ${url}`, {
    statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  });
};

/**
 * Log database operations
 * @param {string} operation - Database operation (insert, update, delete, find)
 * @param {string} collection - MongoDB collection name
 * @param {Object} details - Operation details
 */
logger.logDbOperation = (operation, collection, details = {}) => {
  logger.debug(`DB Operation: ${operation} on ${collection}`, details);
};

/**
 * Log errors with context
 * @param {string} message - Error message
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
logger.logError = (message, error, context = {}) => {
  logger.error(message, {
    error: error?.message,
    code: error?.code,
    ...context,
  });
};

/**
 * Log authentication events
 * @param {string} event - Auth event (login, logout, signup, etc.)
 * @param {string} userId - User ID
 * @param {boolean} success - Whether event was successful
 * @param {Object} details - Additional details
 */
logger.logAuthEvent = (event, userId, success, details = {}) => {
  logger.info(`Auth Event: ${event}`, {
    userId,
    success,
    ...details,
  });
};

/**
 * Log business events
 * @param {string} event - Event name
 * @param {string} userId - User ID
 * @param {Object} details - Event details
 */
logger.logBusinessEvent = (event, userId, details = {}) => {
  logger.info(`Business Event: ${event}`, {
    userId,
    ...details,
  });
};

module.exports = logger;
