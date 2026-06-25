/**
 * Search Routes
 * Routes for performing semantic search, suggestions, and managing search history.
 */

const express = require('express');
const { authenticate } = require('../middlewares/auth');
const searchController = require('../controllers/searchController');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @route   GET /api/search
 * @desc    Perform semantic search for posts or users
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(searchController.search));

/**
 * @route   GET /api/search/suggestions
 * @desc    Retrieve autocomplete suggestions
 * @access  Private
 */
router.get('/suggestions', authenticate, asyncHandler(searchController.getSuggestions));

/**
 * @route   GET /api/search/history
 * @desc    Retrieve user's search history
 * @access  Private
 */
router.get('/history', authenticate, asyncHandler(searchController.getSearchHistory));

/**
 * @route   DELETE /api/search/history
 * @desc    Clear search history (single item or all)
 * @access  Private
 */
router.delete('/history', authenticate, asyncHandler(searchController.clearSearchHistory));

module.exports = router;
