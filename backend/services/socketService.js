/**
 * Socket.io Service
 * Manages WebSocket connections and real-time event broadcasting
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../utils/logger');

let io = null;

// Map user ID to Set of connected socket instances: Map<userId, Set<socket>>
const userSockets = new Map();

/**
 * Initialize Socket.io Server
 * @param {Object} httpServer - HTTP Server instance
 */
const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.SOCKET_CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: config.SOCKET_PING_INTERVAL,
    pingTimeout: config.SOCKET_PING_TIMEOUT,
  });

  // JWT Authentication Middleware for WebSockets
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        logger.warn('Socket connection rejected: Token missing');
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, config.JWT_SECRET);
      socket.user = decoded; // Attach user info to socket
      next();
    } catch (err) {
      logger.warn(`Socket connection rejected: Invalid token - ${err.message}`);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection Event
  io.on('connection', (socket) => {
    const userId = socket.user.userId || socket.user.id;
    logger.info(`🔌 Socket connected: User ${userId} (Socket ID: ${socket.id})`);

    // Add socket to user's set of active connections
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket);

    // Join user-specific room for direct emits
    socket.join(`user:${userId}`);

    // Disconnect Event
    socket.on('disconnect', () => {
      logger.info(`🔌 Socket disconnected: User ${userId} (Socket ID: ${socket.id})`);

      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  logger.info('✅ Socket.io initialized successfully');
  return io;
};

/**
 * Get the io server instance
 * @returns {Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

/**
 * Send real-time event/notification to a specific user
 * @param {string} userId - Recipient User ID
 * @param {string} event - Event name (e.g., 'newNotification')
 * @param {Object} data - Payload data
 * @returns {boolean} Success status
 */
const sendNotificationToUser = (userId, event, data) => {
  if (!io) {
    logger.warn('Cannot send socket notification: io server not initialized');
    return false;
  }

  const sockets = userSockets.get(userId.toString());
  if (sockets && sockets.size > 0) {
    logger.debug(`Emitting ${event} to user ${userId} (${sockets.size} active sockets)`);
    io.to(`user:${userId}`).emit(event, data);
    return true;
  }

  logger.debug(`User ${userId} is offline, skipping real-time socket emit`);
  return false;
};

module.exports = {
  init,
  getIO,
  sendNotificationToUser,
};
