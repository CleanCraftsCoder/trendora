/**
 * Search Service
 * Implements AI-powered semantic search, search history tracking, and autocomplete suggestions
 */

const User = require('../models/User');
const Post = require('../models/Post');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const aiService = require('./aiService');
const logger = require('../utils/logger');

/**
 * Perform semantic search for posts or users
 * @param {Object} params
 * @param {string} params.queryText - The search query
 * @param {string} params.type - The search type ('posts' | 'users')
 * @param {string} [params.currentUserId] - Authenticated user performing search
 * @param {number} [params.limit=20] - Number of results to return
 * @returns {Promise<Array>} Array of matching results ranked by similarity
 */
const search = async ({ queryText, type, currentUserId = null, limit = 20 }) => {
  try {
    if (!queryText || queryText.trim().length < 2) {
      return [];
    }

    // 1. Generate text embedding for the search query
    const queryEmbedding = await aiService.generateTextEmbedding(queryText);

    // Save search query to history if user is logged in
    if (currentUserId) {
      try {
        await saveSearchHistory(currentUserId, queryText);
      } catch (err) {
        logger.warn('Failed to save search history', { userId: currentUserId, err: err.message });
      }
    }

    if (type === 'posts') {
      // SEMANTIC POST SEARCH
      const posts = await Post.find({
        isDeleted: false,
        moderationStatus: { $ne: 'flagged' },
        visibility: 'public',
      }).populate('author', 'username profilePicture firstName lastName');

      const scoredPosts = [];
      const regex = new RegExp(queryText, 'i');

      for (const post of posts) {
        let similarity = 0;
        if (post.embeddings && post.embeddings.length > 0) {
          similarity = aiService.cosineSimilarity(queryEmbedding, post.embeddings);
        }

        // Add keyword exact match boost
        if (post.caption && regex.test(post.caption)) {
          similarity += 0.3; // Keyword boost
        }

        scoredPosts.push({ post, score: similarity });
      }

      // Sort by similarity score descending
      scoredPosts.sort((a, b) => b.score - a.score);

      // Paginate/Slice
      const sliced = scoredPosts.slice(0, limit).map((item) => item.post);

      // Map isLiked status
      let likedPostIds = [];
      if (currentUserId && sliced.length > 0) {
        const postIds = sliced.map((p) => p._id);
        const likes = await Like.find({
          userId: currentUserId,
          postId: { $in: postIds },
          likeType: 'post',
        });
        likedPostIds = likes.map((l) => l.postId.toString());
      }

      return sliced.map((post) => {
        const postObj = post.toObject();
        postObj.isLiked = likedPostIds.includes(post._id.toString());
        return postObj;
      });

    } else {
      // SEMANTIC USER SEARCH
      const users = await User.find({
        _id: { $ne: currentUserId },
      });

      const scoredUsers = [];
      const regex = new RegExp(queryText, 'i');

      for (const userObj of users) {
        // Generate profile embedding if not already cached
        if (!userObj.profileEmbedding || userObj.profileEmbedding.length === 0) {
          const profileText = `${userObj.firstName} ${userObj.lastName} ${userObj.username} ${userObj.bio || ''} ${userObj.preferredHashtags.join(' ')}`;
          try {
            userObj.profileEmbedding = await aiService.generateTextEmbedding(profileText);
            await userObj.save();
          } catch (embErr) {
            logger.warn('Failed to save profile embedding during search', { userId: userObj._id, err: embErr.message });
          }
        }

        let similarity = 0;
        if (userObj.profileEmbedding && userObj.profileEmbedding.length > 0) {
          similarity = aiService.cosineSimilarity(queryEmbedding, userObj.profileEmbedding);
        }

        // Exact name/username keyword match boost
        if (regex.test(userObj.username) || regex.test(userObj.firstName) || regex.test(userObj.lastName)) {
          similarity += 0.4;
        }

        scoredUsers.push({ userObj, score: similarity });
      }

      // Sort by similarity score descending
      scoredUsers.sort((a, b) => b.score - a.score);

      const slicedUsers = scoredUsers.slice(0, limit).map((item) => item.userObj);

      // Map isFollowing status
      let followingIds = [];
      if (currentUserId && slicedUsers.length > 0) {
        const userIds = slicedUsers.map((u) => u._id);
        const followRecords = await Follow.find({
          followerId: currentUserId,
          followingId: { $in: userIds },
        });
        followingIds = followRecords.map((f) => f.followingId.toString());
      }

      return slicedUsers.map((u) => ({
        id: u._id,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        profilePicture: u.profilePicture,
        bio: u.bio,
        isFollowing: followingIds.includes(u._id.toString()),
      }));
    }
  } catch (error) {
    logger.logError('Search service failed', error, { queryText, type });
    throw error;
  }
};

/**
 * Retrieve autocomplete search suggestions
 * Matches tags and creators matching text prefix
 * @param {string} queryText - User search prefix
 * @returns {Promise<Array<string>>} List of suggestions
 */
const getSuggestions = async (queryText = '') => {
  try {
    if (!queryText || queryText.trim().length < 1) {
      return [];
    }

    const suggestions = new Set();
    const regex = new RegExp(`^${queryText}`, 'i');

    // 1. Suggest users matching username prefix
    const users = await User.find({
      username: { $regex: regex }
    })
      .select('username')
      .limit(5);

    for (const u of users) {
      suggestions.add(`@${u.username}`);
    }

    // 2. Suggest hashtags matching caption hashtags prefix
    const posts = await Post.find({
      hashtags: { $regex: regex },
      isDeleted: false,
      visibility: 'public'
    })
      .select('hashtags')
      .limit(10);

    for (const p of posts) {
      if (p.hashtags) {
        for (const tag of p.hashtags) {
          if (tag.toLowerCase().startsWith(queryText.toLowerCase())) {
            suggestions.add(`#${tag}`);
          }
        }
      }
    }

    // 3. Fallback generic word prefixes if suggestions is small
    if (suggestions.size < 5) {
      const genericRegex = new RegExp(`\\b${queryText}\\w*`, 'i');
      const keywordPosts = await Post.find({
        caption: { $regex: genericRegex },
        isDeleted: false,
        visibility: 'public'
      })
        .select('caption')
        .limit(5);

      for (const p of keywordPosts) {
        const words = p.caption.split(/\s+/);
        for (const w of words) {
          const cleaned = w.toLowerCase().replace(/[^\w]/g, '');
          if (cleaned.startsWith(queryText.toLowerCase()) && cleaned.length > 3) {
            suggestions.add(cleaned);
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, 8);
  } catch (error) {
    logger.logError('Failed to get suggestions', error, { queryText });
    return [];
  }
};

/**
 * Save user query to history collection (max 10 recent searches)
 * @param {string} userId - Requesting user ID
 * @param {string} queryText - Searched query
 */
const saveSearchHistory = async (userId, queryText) => {
  const cleanedQuery = queryText.trim();
  if (cleanedQuery.length < 2) return;

  const user = await User.findById(userId);
  if (!user) return;

  // Initialize search history if empty
  if (!user.searchHistory) {
    user.searchHistory = [];
  }

  // Remove existing duplicate queries to pull it to top
  user.searchHistory = user.searchHistory.filter((item) => item.query.toLowerCase() !== cleanedQuery.toLowerCase());

  // Insert at front
  user.searchHistory.unshift({ query: cleanedQuery, createdAt: new Date() });

  // Limit to 10 items
  user.searchHistory = user.searchHistory.slice(0, 10);

  await user.save();
};

/**
 * Retrieve user's search history
 * @param {string} userId - Requesting user ID
 * @returns {Promise<Array>} Array of history records
 */
const getSearchHistory = async (userId) => {
  const user = await User.findById(userId).select('searchHistory');
  if (!user || !user.searchHistory) return [];
  return user.searchHistory;
};

/**
 * Clear/delete search history items
 * @param {string} userId - Requesting user ID
 * @param {string} [itemId] - Specific history ID to delete (if empty, clears all)
 * @returns {Promise<boolean>} Success status
 */
const clearSearchHistory = async (userId, itemId = null) => {
  const user = await User.findById(userId);
  if (!user) return false;

  if (itemId) {
    // Delete single item
    user.searchHistory = user.searchHistory.filter((item) => item._id.toString() !== itemId);
  } else {
    // Clear all history
    user.searchHistory = [];
  }

  await user.save();
  return true;
};

module.exports = {
  search,
  getSuggestions,
  getSearchHistory,
  clearSearchHistory,
};
