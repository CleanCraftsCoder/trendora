/**
 * Notification Service
 * Handles business logic for notifications and broadcasts real-time alerts via socketService
 */

const Notification = require('../models/Notification');
const socketService = require('./socketService');
const logger = require('../utils/logger');

/**
 * Create a new notification and deliver it in real-time if the recipient is online
 * @param {Object} data - Notification parameters
 * @param {string} data.userId - Recipient user ID
 * @param {string} data.actorId - Actor user ID who triggered the action
 * @param {string} data.type - Notification type ('like', 'comment', 'follow', 'mention', 'share')
 * @param {string} [data.postId] - Associated post ID
 * @param {string} [data.commentId] - Associated comment ID
 * @param {string} data.title - Notification title
 * @param {string} [data.message] - Custom notification message text
 * @param {string} data.actionUrl - Redirection link/url
 * @returns {Promise<Object>} Created notification document
 */
const createNotification = async (data) => {
  try {
    // Save to database using model static method
    const notification = await Notification.createFromEvent(data);

    // Populate required references for full client UI details
    const populatedNotification = await notification.populate([
      { path: 'actor', select: 'username profilePicture firstName lastName' },
      { path: 'post', select: 'caption images' },
      { path: 'comment', select: 'text' },
    ]);

    // Broadcast in real-time
    socketService.sendNotificationToUser(
      data.userId.toString(),
      'newNotification',
      populatedNotification
    );

    logger.debug(`Notification created and broadcast attempt made to user: ${data.userId}`);
    return populatedNotification;
  } catch (error) {
    logger.logError('Failed to create notification', error, { data });
    throw error;
  }
};

module.exports = {
  createNotification,
};
