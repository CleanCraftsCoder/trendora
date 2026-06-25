/**
 * Search Controller
 * Handles search queries, suggestion lookups, and search history operations
 */

const searchService = require('../services/searchService');

/**
 * Handle semantic search queries
 * GET /api/search?q=query&type=posts|users
 */
const search = async (req, res, next) => {
  try {
    const { q, type = 'posts' } = req.query;
    const currentUserId = req.user?.id;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query is required' }
      });
    }

    if (!['posts', 'users'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid type parameter. Must be posts or users.' }
      });
    }

    const results = await searchService.search({
      queryText: q,
      type,
      currentUserId,
    });

    res.status(200).json({
      success: true,
      data: results,
      message: 'Search completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle autocomplete search suggestions
 * GET /api/search/suggestions?q=query
 */
const getSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const suggestions = await searchService.getSuggestions(q);

    res.status(200).json({
      success: true,
      data: suggestions,
      message: 'Suggestions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve user search history
 * GET /api/search/history
 */
const getSearchHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const history = await searchService.getSearchHistory(currentUserId);
    res.status(200).json({
      success: true,
      data: history,
      message: 'Search history retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear search history (single item or all)
 * DELETE /api/search/history
 * or
 * DELETE /api/search/history?itemId=id
 */
const clearSearchHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { itemId } = req.query;

    const cleared = await searchService.clearSearchHistory(currentUserId, itemId);

    res.status(200).json({
      success: true,
      message: cleared ? 'History cleared successfully' : 'Failed to clear history'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  search,
  getSuggestions,
  getSearchHistory,
  clearSearchHistory,
};
