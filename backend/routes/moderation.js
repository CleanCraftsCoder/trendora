/**
 * Moderation Routes
 * Handles content moderation queue queries and resolutions
 */

const express = require('express');
const { authenticate } = require('../middlewares/auth');
const moderationController = require('../controllers/moderationController');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/moderation/queue
 * @desc    Retrieve flagged and pending review content
 * @access  Private (Admin Only)
 */
router.get(
  '/queue',
  authenticate,
  asyncHandler(moderationController.getReviewQueue)
);

/**
 * @route   POST /api/moderation/resolve
 * @desc    Resolve content moderation action (approve or delete)
 * @access  Private (Admin Only)
 */
router.post(
  '/resolve',
  authenticate,
  asyncHandler(moderationController.resolveModeration)
);

/**
 * @route   POST /api/moderation/toggle-role
 * @desc    Helper to toggle between user and admin roles for testing
 * @access  Private
 */
router.post(
  '/toggle-role',
  authenticate,
  asyncHandler(moderationController.toggleUserRole)
);

module.exports = router;
