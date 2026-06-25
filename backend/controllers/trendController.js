/**
 * Trend Controller
 * Exposes endpoints for active trending tags and hashtag details/feeds
 */

const trendService = require('../services/trendService');

/**
 * Get active trending hashtags
 * GET /api/trends
 */
const getTrends = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const trends = await trendService.getTrends(limit);

    res.status(200).json({
      success: true,
      data: trends,
      message: 'Trends retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get details, stats history, and post feed for a specific hashtag
 * GET /api/trends/:hashtag
 */
const getTrendDetails = async (req, res, next) => {
  try {
    const { hashtag } = req.params;

    if (!hashtag) {
      return res.status(400).json({
        success: false,
        error: { message: 'Hashtag parameter is required' },
      });
    }

    const details = await trendService.getTrendByHashtag(hashtag);

    if (!details) {
      return res.status(404).json({
        success: false,
        error: { message: `Trend stats for #${hashtag} not found` },
      });
    }

    res.status(200).json({
      success: true,
      data: details,
      message: 'Trend details retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrends,
  getTrendDetails,
};
