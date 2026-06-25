/**
 * Feed Routes
 * Handles personalized feed, explore feed, trending feed, and AI recommendation interactions/configs
 */

const express = require('express');
const { authenticate, authenticateOptional } = require('../middlewares/auth');
const feedController = require('../controllers/feedController');
const { validatePagination, handleValidationErrors } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/feed
 * @desc    Get personalized feed of followed users' posts (Group B) or AI hybrid feed (Group A)
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  validatePagination,
  handleValidationErrors,
  asyncHandler(feedController.getPersonalizedFeed)
);

/**
 * @route   GET /api/feed/explore
 * @desc    Get explore feed of public posts
 * @access  Public (Optional Auth)
 */
router.get(
  '/explore',
  authenticateOptional,
  validatePagination,
  handleValidationErrors,
  asyncHandler(feedController.getExploreFeed)
);

/**
 * @route   GET /api/feed/trending
 * @desc    Get trending feed sorted by engagement
 * @access  Public (Optional Auth)
 */
router.get(
  '/trending',
  authenticateOptional,
  validatePagination,
  handleValidationErrors,
  asyncHandler(feedController.getTrendingFeed)
);

/**
 * @route   POST /api/feed/interact
 * @desc    Log a user interaction event (view, click, share)
 * @access  Private
 */
router.post(
  '/interact',
  authenticate,
  asyncHandler(feedController.logInteraction)
);

/**
 * @route   GET /api/feed/config
 * @desc    Retrieve active A/B testing recommendation config
 * @access  Private
 */
router.get(
  '/config',
  authenticate,
  asyncHandler(feedController.getFeedConfig)
);

/**
 * @route   POST /api/feed/toggle-group
 * @desc    Toggle user between A/B testing groups
 * @access  Private
 */
router.post(
  '/toggle-group',
  authenticate,
  asyncHandler(feedController.toggleABGroup)
);

/**
 * @route   POST /api/feed/batch-update
 * @desc    Admin endpoint to trigger daily recommendation vector batch updates
 * @access  Private
 */
router.post(
  '/batch-update',
  authenticate,
  asyncHandler(feedController.triggerBatchUpdate)
);

module.exports = router;
