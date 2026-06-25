/**
 * Trend Service
 * Processes post hashtags, computes growth trend scores, detects emerging topics,
 * and tracks historical metrics.
 */

const Post = require('../models/Post');
const Trend = require('../models/Trend');
const logger = require('../utils/logger');

/**
 * Calculate and update trending hashtags based on usage growth
 * @returns {Promise<boolean>} Success status
 */
const calculateTrends = async () => {
  try {
    logger.info('Calculating AI trending hashtags...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch public, non-deleted, approved posts from the last 7 days
    const posts = await Post.find({
      isDeleted: false,
      moderationStatus: { $ne: 'flagged' },
      visibility: 'public',
      createdAt: { $gte: sevenDaysAgo },
    });

    // 2. Aggregate counts and post references by hashtag
    const tagStats = {}; // { [tag]: { currentCount: 0, previousCount: 0, posts: [] } }

    for (const post of posts) {
      if (!post.hashtags || post.hashtags.length === 0) continue;

      const isRecent = post.createdAt >= oneDayAgo;

      for (const rawTag of post.hashtags) {
        const tag = rawTag.toLowerCase().trim();
        if (!tag) continue;

        if (!tagStats[tag]) {
          tagStats[tag] = {
            currentCount: 0,
            previousCount: 0,
            posts: [],
          };
        }

        if (isRecent) {
          tagStats[tag].currentCount += 1;
        } else {
          tagStats[tag].previousCount += 1;
        }

        tagStats[tag].posts.push(post);
      }
    }

    const processedTags = new Set();

    // 3. Process and save each hashtag stats
    for (const tag of Object.keys(tagStats)) {
      processedTags.add(tag);
      const stats = tagStats[tag];

      // Sort posts by engagement to keep the top 5: likesCount + commentsCount * 2 + sharesCount * 3
      stats.posts.sort((a, b) => {
        const scoreA = (a.likesCount || 0) + (a.commentsCount || 0) * 2 + (a.sharesCount || 0) * 3;
        const scoreB = (b.likesCount || 0) + (b.commentsCount || 0) * 2 + (b.sharesCount || 0) * 3;
        return scoreB - scoreA;
      });

      const topPostIds = stats.posts.slice(0, 5).map((p) => p._id);

      // Trend growth score calculation
      const current = stats.currentCount;
      const previous = stats.previousCount;
      const growthRate = previous > 0 ? (current - previous) / previous : current;
      const score = current * (1 + growthRate);

      // An emerging trend is one that is growing rapidly (e.g. tripled in use) and has a minimum current count
      const isEmerging = growthRate >= 2.0 && current >= 3;

      // Find or create Trend record
      let trendDoc = await Trend.findOne({ hashtag: tag });

      if (trendDoc) {
        // Add current count to historical data
        trendDoc.countHistory.push({ count: current, timestamp: now });

        // Cap history to last 50 points
        if (trendDoc.countHistory.length > 50) {
          trendDoc.countHistory = trendDoc.countHistory.slice(-50);
        }

        trendDoc.currentCount = current;
        trendDoc.previousCount = previous;
        trendDoc.score = score;
        trendDoc.isEmerging = isEmerging;
        trendDoc.posts = topPostIds;

        await trendDoc.save();
      } else {
        // Create new Trend document
        await Trend.create({
          hashtag: tag,
          currentCount: current,
          previousCount: previous,
          score,
          isEmerging,
          posts: topPostIds,
          countHistory: [{ count: current, timestamp: now }],
        });
      }
    }

    // 4. Reset scores for tags that were not active in this batch
    const inactiveTrends = await Trend.find({ hashtag: { $nin: Array.from(processedTags) } });
    for (const trend of inactiveTrends) {
      trend.currentCount = 0;
      trend.previousCount = 0;
      trend.score = 0;
      trend.isEmerging = false;
      trend.posts = [];
      trend.countHistory.push({ count: 0, timestamp: now });
      if (trend.countHistory.length > 50) {
        trend.countHistory = trend.countHistory.slice(-50);
      }
      await trend.save();
    }

    logger.info(`Trends calculation finished. Updated ${processedTags.size} tags.`);
    return true;
  } catch (error) {
    logger.logError('Failed to calculate trends', error);
    return false;
  }
};

/**
 * Retrieve the list of active trending topics sorted by score
 * @param {number} [limit=10] - Number of items to return
 * @returns {Promise<Array>} List of trends
 */
const getTrends = async (limit = 10) => {
  try {
    let trends = await Trend.find({ score: { $gt: 0 } })
      .sort({ score: -1 })
      .limit(limit);

    // Dynamic fallback: if collection is empty, trigger initial calculation
    if (trends.length === 0) {
      const dbEmptyCheck = await Trend.countDocuments();
      if (dbEmptyCheck === 0) {
        await calculateTrends();
        trends = await Trend.find({ score: { $gt: 0 } })
          .sort({ score: -1 })
          .limit(limit);
      }
    }

    return trends;
  } catch (error) {
    logger.logError('Failed to fetch trends', error);
    throw error;
  }
};

/**
 * Retrieve specific trend details by hashtag text
 * @param {string} rawHashtag - The hashtag name
 * @returns {Promise<Object|null>} Hydrated trend record
 */
const getTrendByHashtag = async (rawHashtag) => {
  try {
    const cleanHashtag = rawHashtag.replace(/^#/, '').toLowerCase().trim();

    return await Trend.findOne({ hashtag: cleanHashtag }).populate({
      path: 'posts',
      match: { isDeleted: false, moderationStatus: { $ne: 'flagged' } },
      populate: {
        path: 'author',
        select: 'username profilePicture firstName lastName',
      },
    });
  } catch (error) {
    logger.logError(`Failed to fetch trend details for: ${rawHashtag}`, error);
    throw error;
  }
};

module.exports = {
  calculateTrends,
  getTrends,
  getTrendByHashtag,
};
