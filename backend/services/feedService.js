const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const mongoose = require('mongoose');

/**
 * Decode a base64 pagination cursor
 * @param {string} cursor - Base64 encoded cursor
 * @returns {Object|null} Decoded JSON object or null
 */
const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch (err) {
    logger.warn('Failed to decode cursor, ignoring', { cursor, error: err.message });
    return null;
  }
};

/**
 * Retrieve personalized feed (posts from self and followed users)
 * @param {Object} params - Query parameters
 * @param {string} params.userId - Requesting user ID
 * @param {string} [params.cursor] - Pagination cursor
 * @param {number} params.limit - Limit per page
 * @returns {Promise<Object>} Paginated feed posts with nextCursor
 */
const getPersonalizedFeed = async ({ userId, cursor = null, limit = 20 }) => {
  const User = require('../models/User');
  const aiService = require('./aiService');

  // Fetch user to check A/B test group
  let user = await User.findById(userId);
  if (!user) {
    throw errors.notFound('User not found');
  }

  // Ensure user has a test group assigned
  if (!user.abGroup) {
    user.abGroup = Math.random() < 0.5 ? 'A' : 'B';
    await user.save();
  }

  const abGroup = user.abGroup;

  // Cache key includes A/B group
  const cacheKey = `feed:personalized:${userId}:ab:${abGroup}:cursor:${cursor || 'none'}:limit:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    let result;

    if (abGroup === 'A') {
      // GROUP A: AI Recommendation Engine (Hybrid feed)
      // Decode offset-based cursor
      let offset = 0;
      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
          offset = parseInt(decoded.offset || 0, 10);
        } catch (err) {
          logger.warn('Failed to decode Group A cursor', { cursor });
        }
      }

      // 1. Get followed posts
      const followingIds = await Follow.getFollowingIds(userId);
      const followingList = followingIds.map((f) => f.followingId);

      const followedQuery = {
        isDeleted: false,
        moderationStatus: { $ne: 'flagged' },
        $or: [
          { author: userId },
          {
            author: { $in: followingList },
            visibility: { $in: ['public', 'friends'] },
          },
        ],
      };

      // Fetch recent posts from self and following
      const followedPosts = await Post.find(followedQuery)
        .populate('author', 'username profilePicture firstName lastName')
        .sort({ createdAt: -1 })
        .limit(100);

      // 2. Fetch recommended posts (public posts from non-followed accounts, excluding viewed)
      // Call aiService with a slightly higher limit to choose from
      const recResult = await aiService.getRecommendedPosts({
        userId,
        limit: 50,
      });
      const recommendedPosts = recResult.data || [];

      // 3. Score and Merge
      const hasPrefs = user.preferenceVector && user.preferenceVector.length > 0;

      // Score followed posts using the recommendation model (with follow/affinity bonus)
      const scoredFollowed = followedPosts.map((post) => {
        let contentSim = 0;
        let hashtagScore = 0;
        let authorScore = 0.8; // default affinity for followed accounts

        const authorIdStr = post.author._id.toString();
        if (authorIdStr === userId) {
          authorScore = 1.0; // high preference for own posts
        }

        if (hasPrefs && post.embeddings && post.embeddings.length > 0) {
          contentSim = aiService.cosineSimilarity(user.preferenceVector, post.embeddings);
        }

        if (post.hashtags && post.hashtags.length > 0 && user.preferredHashtags && user.preferredHashtags.length > 0) {
          const matches = post.hashtags.filter((tag) => user.preferredHashtags.includes(tag.toLowerCase()));
          hashtagScore = matches.length / Math.max(post.hashtags.length, 1);
        }

        // Recency decay factor
        const hours = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
        const rawEngagement = (post.likesCount || 0) * 2 + (post.commentsCount || 0) * 3 + (post.sharesCount || 0) * 5;
        const trendingFactor = rawEngagement / Math.pow(hours + 2, 1.5);
        const normalizedTrending = Math.min(trendingFactor / 10, 1.0);

        // Score formula: followed accounts get a follow bonus (+0.3)
        const score = (0.4 * contentSim) + (0.2 * hashtagScore) + (0.2 * authorScore) + (0.2 * normalizedTrending) + 0.3;

        return {
          post: post.toObject(),
          score,
        };
      });

      // Format recommended posts to match
      const formattedRecommended = recommendedPosts.map((postObj) => {
        return {
          post: postObj,
          score: postObj.recommendationScore || 0,
        };
      });

      // Merge and sort
      const merged = [...scoredFollowed, ...formattedRecommended];
      // Sort by score descending
      merged.sort((a, b) => b.score - a.score);

      // Paginate
      const startIdx = offset;
      const endIdx = offset + limit;
      const paginatedItems = merged.slice(startIdx, endIdx);
      const hasMore = merged.length > endIdx;

      // Extract post objects and check isLiked status
      const paginatedPosts = paginatedItems.map((item) => item.post);

      let userLikedPostIds = [];
      if (paginatedPosts.length > 0) {
        const postIds = paginatedPosts.map((p) => p._id);
        const likes = await Like.find({
          userId,
          postId: { $in: postIds },
          likeType: 'post',
        });
        userLikedPostIds = likes.map((l) => l.postId.toString());
      }

      const data = paginatedPosts.map((postObj) => {
        postObj.isLiked = userLikedPostIds.includes(postObj._id.toString());
        return postObj;
      });

      // Generate next cursor
      let nextCursor = null;
      if (hasMore) {
        nextCursor = Buffer.from(
          JSON.stringify({
            offset: endIdx,
            timestamp: Date.now(),
          })
        ).toString('base64');
      }

      result = {
        data,
        pagination: {
          nextCursor,
          hasMore,
          limit,
        },
        meta: {
          abGroup,
          algorithm: 'AI Recommendation Hybrid Feed',
        },
      };

    } else {
      // GROUP B: Chronological followed feed (Existing original logic)
      const decodedCursor = decodeCursor(cursor);

      // Get list of users the current user is following
      const followingIds = await Follow.getFollowingIds(userId);
      const followingList = followingIds.map((f) => f.followingId);

      // Query posts by followed users (public or friends) or by self
      const query = {
        isDeleted: false,
        moderationStatus: { $ne: 'flagged' },
        $or: [
          { author: userId },
          {
            author: { $in: followingList },
            visibility: { $in: ['public', 'friends'] },
          },
        ],
      };

      // Apply cursor filter if present
      if (decodedCursor && decodedCursor.createdAt && decodedCursor.id) {
        query.$and = [
          {
            $or: [
              { createdAt: { $lt: new Date(decodedCursor.createdAt) } },
              {
                createdAt: new Date(decodedCursor.createdAt),
                _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) }
              }
            ]
          }
        ];
      }

      // Fetch limit + 1 posts to check if there is a next page
      const posts = await Post.find(query)
        .populate('author', 'username profilePicture firstName lastName')
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1);

      const hasMore = posts.length > limit;
      const paginatedPosts = hasMore ? posts.slice(0, limit) : posts;

      // Map isLiked status
      let userLikedPostIds = [];
      if (paginatedPosts.length > 0) {
        const postIds = paginatedPosts.map((p) => p._id);
        const likes = await Like.find({
          userId,
          postId: { $in: postIds },
          likeType: 'post',
        });
        userLikedPostIds = likes.map((l) => l.postId.toString());
      }

      const data = paginatedPosts.map((post) => {
        const postObj = post.toObject();
        postObj.isLiked = userLikedPostIds.includes(post._id.toString());
        return postObj;
      });

      // Generate next cursor
      let nextCursor = null;
      if (hasMore && paginatedPosts.length > 0) {
        const lastPost = paginatedPosts[paginatedPosts.length - 1];
        nextCursor = Buffer.from(
          JSON.stringify({
            createdAt: lastPost.createdAt,
            id: lastPost._id.toString()
          })
        ).toString('base64');
      }

      result = {
        data,
        pagination: {
          nextCursor,
          hasMore,
          limit,
        },
        meta: {
          abGroup,
          algorithm: 'Chronological Followed Feed',
        },
      };
    }

    // Cache the result for 30 mins
    await cache.set(cacheKey, result, 1800);

    return result;
  } catch (error) {
    logger.logError('Personalized feed service error', error, { userId });
    throw error;
  }
};

/**
 * Retrieve explore feed (general public posts, excluding own posts optionally)
 * @param {Object} params - Query parameters
 * @param {string} [params.currentUserId] - Authenticated requester ID
 * @param {string} [params.cursor] - Pagination cursor
 * @param {number} params.limit - Limit per page
 * @returns {Promise<Object>} Paginated explore posts with nextCursor
 */
const getExploreFeed = async ({ currentUserId = null, cursor = null, limit = 20 }) => {
  const cacheKey = `feed:explore:${currentUserId || 'guest'}:cursor:${cursor || 'none'}:limit:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const decodedCursor = decodeCursor(cursor);

    const query = {
      isDeleted: false,
      visibility: 'public',
      moderationStatus: { $ne: 'flagged' },
    };

    if (currentUserId) {
      // Exclude own posts from explore feed
      query.author = { $ne: currentUserId };
    }

    // Apply cursor filter if present
    if (decodedCursor && decodedCursor.createdAt && decodedCursor.id) {
      query.$and = [
        {
          $or: [
            { createdAt: { $lt: new Date(decodedCursor.createdAt) } },
            {
              createdAt: new Date(decodedCursor.createdAt),
              _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) }
            }
          ]
        }
      ];
    }

    // Fetch limit + 1 posts
    const posts = await Post.find(query)
      .populate('author', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const paginatedPosts = hasMore ? posts.slice(0, limit) : posts;

    let userLikedPostIds = [];
    if (currentUserId && paginatedPosts.length > 0) {
      const postIds = paginatedPosts.map((p) => p._id);
      const likes = await Like.find({
        userId: currentUserId,
        postId: { $in: postIds },
        likeType: 'post',
      });
      userLikedPostIds = likes.map((l) => l.postId.toString());
    }

    const data = paginatedPosts.map((post) => {
      const postObj = post.toObject();
      postObj.isLiked = userLikedPostIds.includes(post._id.toString());
      return postObj;
    });

    // Generate next cursor
    let nextCursor = null;
    if (hasMore && paginatedPosts.length > 0) {
      const lastPost = paginatedPosts[paginatedPosts.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          createdAt: lastPost.createdAt,
          id: lastPost._id.toString()
        })
      ).toString('base64');
    }

    const result = {
      data,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };

    await cache.set(cacheKey, result, 1800);

    return result;
  } catch (error) {
    logger.logError('Explore feed service error', error, { currentUserId });
    throw error;
  }
};

/**
 * Retrieve trending feed based on engagement score and time decay
 * @param {Object} params - Query parameters
 * @param {string} [params.currentUserId] - Requesting user ID
 * @param {string} params.timeRange - Filter by timeframe ('24h', '7d', '30d')
 * @param {string} [params.cursor] - Pagination cursor
 * @param {number} params.limit - Limit per page
 * @returns {Promise<Object>} Paginated trending posts with nextCursor
 */
const getTrendingFeed = async ({ currentUserId = null, timeRange = '24h', cursor = null, limit = 20 }) => {
  const cacheKey = `feed:trending:${currentUserId || 'guest'}:range:${timeRange}:cursor:${cursor || 'none'}:limit:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const decodedCursor = decodeCursor(cursor);

    // Determine starting date based on timeRange
    let startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Default 24h
    if (timeRange === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Pipeline to filter, add scores, subtract time decay, sort and limit
    const pipeline = [
      {
        $match: {
          isDeleted: false,
          visibility: 'public',
          moderationStatus: { $ne: 'flagged' },
          createdAt: { $gte: startDate },
        },
      },
      {
        $addFields: {
          hoursSinceCreation: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60,
            ],
          },
        },
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ['$likesCount', 2.0] },
              { $multiply: ['$commentsCount', 3.0] },
              { $multiply: ['$sharesCount', 5.0] },
            ],
          },
        },
      },
      {
        $addFields: {
          decayedScore: {
            $subtract: [
              '$engagementScore',
              { $multiply: ['$hoursSinceCreation', 0.5] },
            ],
          },
        },
      },
    ];

    // Apply cursor condition inside aggregation pipeline
    if (decodedCursor && decodedCursor.decayedScore && decodedCursor.id) {
      const cursorDecayedScore = parseFloat(decodedCursor.decayedScore);
      pipeline.push({
        $match: {
          $or: [
            { decayedScore: { $lt: cursorDecayedScore } },
            {
              decayedScore: cursorDecayedScore,
              _id: { $lt: new mongoose.Types.ObjectId(decodedCursor.id) }
            }
          ]
        }
      });
    }

    pipeline.push(
      {
        $sort: { decayedScore: -1, _id: -1 },
      },
      {
        $limit: limit + 1,
      }
    );

    const posts = await Post.aggregate(pipeline);

    const hasMore = posts.length > limit;
    const paginatedPosts = hasMore ? posts.slice(0, limit) : posts;

    // Populate post author relationships
    const populatedPosts = await Post.populate(paginatedPosts, {
      path: 'author',
      select: 'username profilePicture firstName lastName',
    });

    // Populate isLiked status
    let userLikedPostIds = [];
    if (currentUserId && populatedPosts.length > 0) {
      const postIds = populatedPosts.map((p) => p._id);
      const likes = await Like.find({
        userId: currentUserId,
        postId: { $in: postIds },
        likeType: 'post',
      });
      userLikedPostIds = likes.map((l) => l.postId.toString());
    }

    const data = populatedPosts.map((post) => {
      const postObj = { ...post };
      postObj.isLiked = userLikedPostIds.includes(post._id.toString());
      return postObj;
    });

    // Generate next cursor
    let nextCursor = null;
    if (hasMore && paginatedPosts.length > 0) {
      const lastPost = paginatedPosts[paginatedPosts.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          decayedScore: lastPost.decayedScore,
          id: lastPost._id.toString()
        })
      ).toString('base64');
    }

    const result = {
      data,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };

    await cache.set(cacheKey, result, 900); // 15 mins cache for trending feed

    return result;
  } catch (error) {
    logger.logError('Trending feed service error', error, { currentUserId, timeRange });
    throw error;
  }
};

/**
 * Invalidate all cached feed data
 */
const invalidateFeedCache = async () => {
  logger.info('Invalidating all feed cache keys');
  await cache.clearPattern('feed:*');
};

module.exports = {
  getPersonalizedFeed,
  getExploreFeed,
  getTrendingFeed,
  invalidateFeedCache,
};
