/**
 * Server Entry Point
 * Starts the Express server and connects to MongoDB
 */

const app = require('./app');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const socketService = require('./services/socketService');

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDB();

    // Start listening on port
    const server = app.listen(config.PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║         🚀 TRENDORA BACKEND STARTED         ║
╠════════════════════════════════════════════╣
║ App Name:     ${config.APP_NAME.padEnd(35)} ║
║ Environment:  ${config.NODE_ENV.padEnd(35)} ║
║ Port:         ${config.PORT.toString().padEnd(35)} ║
║ API URL:      http://localhost:${config.PORT}        ║
║ API Version:  v1                           ║
╚════════════════════════════════════════════╝
      `);

      logger.info(`📊 Database: ${config.DB_NAME}`);
      logger.info(`🔐 JWT Configured: ${config.JWT_SECRET ? '✓' : '✗'}`);
      logger.info(`📝 Logging Level: ${config.LOG_LEVEL}`);
      logger.info(`📁 Upload Directory: ${config.MULTER_UPLOAD_PATH}`);
    });

    // Initialize Socket.io
    socketService.init(server);

    /**
     * Graceful Shutdown
     */
    const gracefulShutdown = async (signal) => {
      logger.warn(`\n${signal} received, shutting down gracefully...`);

      // Stop accepting new requests
      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        try {
          const { mongoose } = require('./config/database');
          await mongoose.disconnect();
          logger.info('MongoDB connection closed');
        } catch (error) {
          logger.error('Error closing database connection:', error);
        }

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    /**
     * Handle Uncaught Exceptions
     */
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    /**
     * Handle Unhandled Promise Rejections
     */
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason,
      });
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = startServer;
