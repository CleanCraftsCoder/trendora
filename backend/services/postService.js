const Post = require('../models/Post');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Like = require('../models/Like');
const feedService = require('./feedService');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * Extract hashtags from caption text
 * @param {string} caption - Post caption
 * @returns {Array<string>} Array of lowercase hashtags without # symbol
 */
const extractHashtags = (caption) => {
  if (!caption) return [];
  const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
  const hashtags = [];
  let match;
  
  while ((match = hashtagRegex.exec(caption)) !== null) {
    const tag = match[1].toLowerCase();
    if (!hashtags.includes(tag)) {
      hashtags.push(tag);
    }
  }
  return hashtags;
};

/**
 * Create a new post
 * @param {string} authorId - ID of user creating the post
 * @param {Object} postData - Post attributes
 * @param {string} postData.caption - Post caption
 * @param {string} postData.visibility - Visibility level
 * @param {Array<string>} postData.images - Array of uploaded image paths
 * @returns {Promise<Object>} Created post document
 */
const createPost = async (authorId, postData) => {
  try {
    const { caption, visibility, images } = postData;

    if (!images || images.length === 0) {
      throw errors.badRequest('At least one image is required for a post');
    }

    const hashtags = extractHashtags(caption);

    // Generate embeddings for recommendation engine (Phase 12)
    const aiService = require('./aiService');
    let embeddings = [];
    try {
      embeddings = await aiService.generateTextEmbedding(caption, hashtags);
    } catch (embErr) {
      logger.warn('Failed to generate post embeddings, using empty array', { error: embErr.message });
    }

    const newPost = new Post({
      author: authorId,
      caption,
      images,
      visibility: visibility || 'public',
      hashtags,
      embeddings,
    });

    // Run AI Moderation (Phase 14)
    const moderationService = require('./moderationService');
    await moderationService.moderatePost(newPost);

    await newPost.save();

    // Increment author's post count
    await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });
    await cache.clearPattern(`user:profile:${authorId}:*`);

    logger.logBusinessEvent('post_created', authorId, {
      postId: newPost._id.toString(),
      imagesCount: images.length,
      hashtagsCount: hashtags.length,
    });

    feedService.invalidateFeedCache();

    return await newPost.populate('author', 'username profilePicture firstName lastName');
  } catch (error) {
    logger.logError('Create post service error', error, { authorId });
    throw error;
  }
};

/**
 * Retrieve post by ID with security checks
 * @param {string} postId - Post ID
 * @param {string} currentUserId - Authenticated requester ID (optional)
 * @returns {Promise<Object>} Post document
 */
const getPostById = async (postId, currentUserId = null) => {
  const cacheKey = `post:details:${postId}:${currentUserId || 'guest'}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const post = await Post.findOne({ _id: postId, isDeleted: false })
      .populate('author', 'username profilePicture firstName lastName');

    if (!post) {
      throw errors.notFound('Post not found');
    }

    const authorId = post.author._id.toString();

    // Visibility Check
    if (authorId !== currentUserId) {
      if (post.visibility === 'private') {
        throw errors.forbidden('This post is private');
      }

      if (post.visibility === 'friends') {
        if (!currentUserId) {
          throw errors.unauthorized('Please log in to view this post');
        }
        
        // Check if current user is following the author
        const isFollowing = await Follow.isFollowing(currentUserId, authorId);
        if (!isFollowing) {
          throw errors.forbidden('This post is only visible to followers');
        }
      }
    }

    const postObj = post.toObject();
    postObj.isLiked = currentUserId
      ? await Like.hasUserLikedPost(currentUserId, postId)
      : false;

    // Log click/view engagement in background (Phase 12)
    if (currentUserId && post.author._id.toString() !== currentUserId) {
      const Engagement = require('../models/Engagement');
      Engagement.log(currentUserId, postId, 'click').catch((err) =>
        logger.warn('Failed to log click engagement', { postId, currentUserId, error: err.message })
      );
      const aiService = require('./aiService');
      aiService.updateUserPreferences(currentUserId).catch((err) =>
        logger.warn('Failed to update preferences on click', { userId: currentUserId, err: err.message })
      );
    }

    await cache.set(cacheKey, postObj, 3600); // Cache for 1 hour

    return postObj;
  } catch (error) {
    logger.logError('Get post by ID service error', error, { postId, currentUserId });
    throw error;
  }
};

/**
 * Update existing post details
 * @param {string} postId - Post ID
 * @param {string} authorId - ID of user attempting the update
 * @param {Object} updateData - Updated attributes
 * @returns {Promise<Object>} Updated post
 */
const updatePost = async (postId, authorId, updateData) => {
  try {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw errors.notFound('Post not found');
    }

    // Owner check
    if (post.author.toString() !== authorId) {
      throw errors.forbidden('You are not authorized to edit this post');
    }

    const { caption, visibility } = updateData;

    if (caption !== undefined) {
      post.caption = caption;
      post.hashtags = extractHashtags(caption);
      // Regenerate embeddings (Phase 12)
      try {
        const aiService = require('./aiService');
        post.embeddings = await aiService.generateTextEmbedding(caption, post.hashtags);
      } catch (embErr) {
        logger.warn('Failed to regenerate post embeddings on update', { error: embErr.message });
      }
    }

    if (visibility !== undefined) {
      post.visibility = visibility;
    }

    // Run AI Moderation (Phase 14)
    const moderationService = require('./moderationService');
    await moderationService.moderatePost(post);

    await post.save();

    logger.logBusinessEvent('post_updated', authorId, { postId });

    feedService.invalidateFeedCache();
    await cache.clearPattern(`post:details:${postId}:*`);

    return await post.populate('author', 'username profilePicture firstName lastName');
  } catch (error) {
    logger.logError('Update post service error', error, { postId, authorId });
    throw error;
  }
};

/**
 * Soft delete a post
 * @param {string} postId - Post ID
 * @param {string} authorId - ID of user requesting deletion
 * @returns {Promise<boolean>} Success status
 */
const deletePost = async (postId, authorId) => {
  try {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw errors.notFound('Post not found');
    }

    // Owner check
    if (post.author.toString() !== authorId) {
      throw errors.forbidden('You are not authorized to delete this post');
    }

    post.isDeleted = true;
    await post.save();

    // Decrement author's post count
    await User.findByIdAndUpdate(authorId, { $inc: { postsCount: -1 } });
    await cache.clearPattern(`user:profile:${authorId}:*`);

    logger.logBusinessEvent('post_deleted', authorId, { postId });

    feedService.invalidateFeedCache();
    await cache.clearPattern(`post:details:${postId}:*`);

    return true;
  } catch (error) {
    logger.logError('Delete post service error', error, { postId, authorId });
    throw error;
  }
};

/**
 * Get posts list with pagination and privacy filtering
 * @param {Object} filters - Search filters
 * @param {string} filters.authorId - Author ID to query
 * @param {string} filters.hashtag - Hashtag tag to filter by
 * @param {string} filters.currentUserId - Authenticated requester ID
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {Promise<Object>} Paginated posts object
 */
const getPosts = async (filters) => {
  try {
    const { authorId, hashtag, currentUserId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };

    if (hashtag) {
      query.hashtags = hashtag.toLowerCase();
    }

    // Handing author and visibility logic
    if (authorId) {
      query.author = authorId;

      if (authorId !== currentUserId) {
        // Fetching another user's posts
        const isFollowing = currentUserId 
          ? await Follow.isFollowing(currentUserId, authorId) 
          : false;

        if (isFollowing) {
          query.visibility = { $in: ['public', 'friends'] };
        } else {
          query.visibility = 'public';
        }
      }
      // If authorId === currentUserId, we show all (no visibility filters on own posts)
    } else {
      // General feed/explore search
      if (currentUserId) {
        // Query posts that are public, own private/friends, or posts by people they follow (friends)
        const followingIds = await Follow.getFollowingIds(currentUserId);
        const followingList = followingIds.map((f) => f.followingId);

        query.$or = [
          { visibility: 'public' },
          { author: currentUserId },
          { 
            author: { $in: followingList }, 
            visibility: 'friends' 
          }
        ];
      } else {
        // Guest users can only see public posts
        query.visibility = 'public';
      }
    }

    const posts = await Post.find(query)
      .populate('author', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    let userLikedPostIds = [];
    if (currentUserId && posts.length > 0) {
      const postIds = posts.map((p) => p._id);
      const likes = await Like.find({
        userId: currentUserId,
        postId: { $in: postIds },
        likeType: 'post',
      });
      userLikedPostIds = likes.map((l) => l.postId.toString());
    }

    const postsWithLiked = posts.map((post) => {
      const postObj = post.toObject();
      postObj.isLiked = userLikedPostIds.includes(post._id.toString());
      return postObj;
    });

    return {
      data: postsWithLiked,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.logError('Get posts list service error', error, { filters });
    throw error;
  }
};

module.exports = {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  getPosts,
};
