/**
 * Moderation Controller
 * Handles administrative review queue queries and moderation resolutions
 */

const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const cache = require('../utils/cache');
const feedService = require('../services/feedService');

/**
 * Retrieve review queue (flagged and pending review posts/comments)
 * GET /api/moderation/queue
 */
const getReviewQueue = async (req, res, next) => {
  try {
    // Admin verification
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Access forbidden. Administrator privileges required.' }
      });
    }

    // Fetch flagged/pending posts
    const posts = await Post.find({
      isDeleted: false,
      moderationStatus: { $in: ['flagged', 'pending_review'] },
    })
      .populate('author', 'username profilePicture firstName lastName')
      .sort({ updatedAt: -1 });

    // Fetch flagged/pending comments
    const comments = await Comment.find({
      isDeleted: false,
      moderationStatus: { $in: ['flagged', 'pending_review'] },
    })
      .populate('author', 'username profilePicture firstName lastName')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        posts,
        comments,
      },
      message: 'Moderation review queue retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve moderation action on post or comment (approve or hard-delete/soft-delete)
 * POST /api/moderation/resolve
 */
const resolveModeration = async (req, res, next) => {
  try {
    // Admin verification
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Access forbidden. Administrator privileges required.' }
      });
    }

    const { targetType, targetId, action } = req.body;

    if (!targetType || !targetId || !action) {
      return res.status(400).json({
        success: false,
        error: { message: 'targetType, targetId, and action are required' }
      });
    }

    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid targetType. Must be post or comment.' }
      });
    }

    if (!['approve', 'delete'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid action. Must be approve or delete.' }
      });
    }

    if (targetType === 'post') {
      const post = await Post.findById(targetId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: { message: 'Post not found' }
        });
      }

      if (action === 'approve') {
        post.moderationStatus = 'approved';
        post.moderationReason = '';
        await post.save();
      } else if (action === 'delete') {
        post.isDeleted = true;
        await post.save();

        // Decrement author's post count
        await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
        await cache.clearPattern(`user:profile:${post.author}:*`);
      }

      await cache.clearPattern(`post:details:${targetId}:*`);
      await feedService.invalidateFeedCache();
    } else {
      const comment = await Comment.findById(targetId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Comment not found' }
        });
      }

      if (action === 'approve') {
        comment.moderationStatus = 'approved';
        comment.moderationReason = '';
        await comment.save();
      } else if (action === 'delete') {
        comment.isDeleted = true;
        await comment.save();

        // Decrement comment count on post
        await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
        await cache.clearPattern(`post:details:${comment.postId}:*`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Content ${action === 'approve' ? 'approved' : 'deleted'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper endpoint to toggle the current user's role between user and admin
 * POST /api/users/toggle-role
 */
const toggleUserRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        role: user.role,
        username: user.username,
      },
      message: `User role toggled to ${user.role}`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReviewQueue,
  resolveModeration,
  toggleUserRole,
};
