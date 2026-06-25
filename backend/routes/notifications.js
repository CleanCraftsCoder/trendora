/**
 * Notification Routes
 * Handles user notification endpoints
 */

const express = require('express');
const { authenticate } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');
const { validateObjectId, handleValidationErrors } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get user's notifications (paginated)
 * @access  Private
 */
router.get('/', notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 * @access  Private
 */
router.put('/read-all', notificationController.markAllNotificationsRead);

/**
 * @route   PUT /api/notifications/:notificationId
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.put(
  '/:notificationId',
  validateObjectId('notificationId'),
  handleValidationErrors,
  notificationController.markNotificationRead
);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete a specific notification
 * @access  Private
 */
router.delete(
  '/:notificationId',
  validateObjectId('notificationId'),
  handleValidationErrors,
  notificationController.deleteNotification
);

module.exports = router;
