/**
 * MongoDB Database Connection Configuration
 * Handles MongoDB connection with proper error handling and reconnection
 */

const mongoose = require('mongoose');
const config = require('./environment');
const logger = require('../utils/logger');

/**
 * MongoDB Connection Options
 * Optimized for production use
 */
const mongooseOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 45000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
};

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    logger.info('Attempting to connect to MongoDB...');

    const dbUri = config.NODE_ENV === 'test' ? config.MONGODB_TEST_URI : config.MONGODB_URI;
    const options = {
      ...mongooseOptions,
      dbName: config.NODE_ENV === 'test' ? 'trendora_test' : config.DB_NAME,
    };
    const conn = await mongoose.connect(dbUri, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);
    logger.info(`Connection State: Connected`);

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB Connection Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error.message);
    process.exit(1);
  }
};

/**
 * Get current database connection state
 * @returns {string} Connection state
 */
const getConnectionState = () => {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  return states[mongoose.connection.readyState] || 'Unknown';
};

/**
 * Setup connection event listeners
 */
const setupConnectionListeners = () => {
  // Connected
  mongoose.connection.on('connected', () => {
    logger.info('Mongoose connection opened to MongoDB');
  });

  // Disconnected
  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose connection disconnected');
  });

  // Error
  mongoose.connection.on('error', (error) => {
    logger.error('Mongoose connection error:', {
      message: error.message,
      stack: error.stack,
    });
  });

  // Reconnected
  mongoose.connection.on('reconnected', () => {
    logger.info('Mongoose reconnected to MongoDB');
  });

  // Attempting to reconnect
  mongoose.connection.on('reconnectFailed', () => {
    logger.error('Mongoose reconnect failed');
  });
};

// Setup listeners on import
setupConnectionListeners();

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionState,
  mongoose,
};
