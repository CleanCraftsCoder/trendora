const feedService = require('../services/feedService');
const Engagement = require('../models/Engagement');
const User = require('../models/User');
const aiService = require('../services/aiService');
const { sendCursorPaginated } = require('../utils/response');

/**
 * Get personalized feed for the authenticated user
 * GET /api/feed
 */
const getPersonalizedFeed = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await feedService.getPersonalizedFeed({
      userId,
      cursor,
      limit,
    });

    // Send custom paginated response with the A/B testing metadata included
    res.status(200).json({
      success: true,
      status: 200,
      data: result.data,
      pagination: {
        nextCursor: result.pagination.nextCursor,
        hasMore: result.pagination.hasMore,
        limit: result.pagination.limit,
      },
      meta: result.meta || {},
      message: 'Success',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get explore feed of public posts
 * GET /api/feed/explore
 */
const getExploreFeed = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await feedService.getExploreFeed({
      currentUserId,
      cursor,
      limit,
    });

    sendCursorPaginated(
      res,
      result.data,
      result.pagination.nextCursor,
      result.pagination.hasMore,
      result.pagination.limit
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending feed
 * GET /api/feed/trending
 */
const getTrendingFeed = async (req, res, next) => {
  try {
    const currentUserId = req.user?.id;
    const { timeRange, cursor } = req.query;
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await feedService.getTrendingFeed({
      currentUserId,
      timeRange,
      cursor,
      limit,
    });

    sendCursorPaginated(
      res,
      result.data,
      result.pagination.nextCursor,
      result.pagination.hasMore,
      result.pagination.limit
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Log interaction on a post
 * POST /api/feed/interact
 */
const logInteraction = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { postId, interactionType } = req.body;

    if (!postId || !interactionType) {
      return res.status(400).json({
        success: false,
        error: { message: 'postId and interactionType are required' }
      });
    }

    const engagement = await Engagement.log(userId, postId, interactionType);
    
    // Recalculate user preferences in background
    aiService.updateUserPreferences(userId).catch((err) =>
      console.error('[logInteraction] bg preference update error:', err.message)
    );

    res.status(200).json({
      success: true,
      data: engagement,
      message: 'Engagement interaction logged'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feed configurations & active group
 * GET /api/feed/config
 */
const getFeedConfig = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Ensure A/B test group exists
    if (!user.abGroup) {
      user.abGroup = Math.random() < 0.5 ? 'A' : 'B';
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        abGroup: user.abGroup,
        algorithm: user.abGroup === 'A' ? 'AI Recommendation Engine' : 'Chronological Followed Feed',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle A/B testing group manually for development/testing
 * POST /api/feed/toggle-group
 */
const toggleABGroup = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Toggle
    user.abGroup = user.abGroup === 'A' ? 'B' : 'A';
    await user.save();

    // Clear feed cache for this user so it updates immediately
    await feedService.invalidateFeedCache();

    res.status(200).json({
      success: true,
      data: {
        abGroup: user.abGroup,
        algorithm: user.abGroup === 'A' ? 'AI Recommendation Engine' : 'Chronological Followed Feed',
      },
      message: `A/B Group updated to ${user.abGroup}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger manual recommendations batch update
 * POST /api/feed/batch-update
 */
const triggerBatchUpdate = async (req, res, next) => {
  try {
    const processedCount = await aiService.processDailyRecommendations();
    res.status(200).json({
      success: true,
      message: `Batch update completed successfully. Processed ${processedCount} active users.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPersonalizedFeed,
  getExploreFeed,
  getTrendingFeed,
  logInteraction,
  getFeedConfig,
  toggleABGroup,
  triggerBatchUpdate,
};
