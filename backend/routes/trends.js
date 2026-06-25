/**
 * Trend Routes
 * Routes for retrieving trending topics and detailed trend analytics
 */

const express = require('express');
const { authenticate } = require('../middlewares/auth');
const trendController = require('../controllers/trendController');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/trends
 * @desc    Retrieve all active trending hashtags
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(trendController.getTrends));

/**
 * @route   GET /api/trends/:hashtag
 * @desc    Retrieve statistics, history, and posts associated with a hashtag
 * @access  Private
 */
router.get('/:hashtag', authenticate, asyncHandler(trendController.getTrendDetails));

module.exports = router;
