/**
 * Notification Controller
 * Express controller methods for notification endpoints
 */

const Notification = require('../models/Notification');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Get user's notifications (paginated)
 * GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unreadOnly === 'true';

    const query = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const total = await Notification.countDocuments(query);
    const data = await Notification.getUserNotifications(userId, limit, skip, unreadOnly);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.logError('Get notifications controller error', error, { userId: req.user?.id });
    next(error);
  }
};

/**
 * Get unread notification count for the authenticated user
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    logger.logError('Get unread count controller error', error, { userId: req.user?.id });
    next(error);
  }
};

/**
 * Mark a specific notification as read
 * PUT /api/notifications/:notificationId
 */
const markNotificationRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      throw errors.notFound('Notification not found or not owned by user');
    }

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    logger.logError('Mark notification read controller error', error, {
      userId: req.user?.id,
      notificationId: req.params.notificationId,
    });
    next(error);
  }
};

/**
 * Mark all notifications as read for the user
 * PUT /api/notifications/read-all
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    logger.logError('Mark all notifications read controller error', error, { userId: req.user?.id });
    next(error);
  }
};

/**
 * Delete a specific notification
 * DELETE /api/notifications/:notificationId
 */
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw errors.notFound('Notification not found or not owned by user');
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    logger.logError('Delete notification controller error', error, {
      userId: req.user?.id,
      notificationId: req.params.notificationId,
    });
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
