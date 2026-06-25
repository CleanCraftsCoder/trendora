const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const feedService = require('./feedService');
const notificationService = require('./notificationService');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * Extract user mentions from comment text
 * @param {string} text - Comment text
 * @returns {Promise<Array<string>>} Array of user IDs mentioned
 */
const extractMentions = async (text) => {
  if (!text) return [];
  const mentionRegex = /@([a-zA-Z0-9_-]{3,20})/g;
  const usernames = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    if (!usernames.includes(username)) {
      usernames.push(username);
    }
  }

  if (usernames.length === 0) return [];

  const users = await User.find({ username: { $in: usernames } });
  return users.map((u) => u._id);
};

/**
 * Create a new comment or reply
 * @param {string} postId - Post ID
 * @param {string} authorId - Author ID
 * @param {Object} commentData - Comment details
 * @param {string} commentData.text - Comment text
 * @param {string} [commentData.parentComment] - Parent comment ID for replies
 * @returns {Promise<Object>} Created comment document populated
 */
const createComment = async (postId, authorId, commentData) => {
  try {
    const { text, parentComment: parentCommentId } = commentData;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      throw errors.notFound('Post not found');
    }

    const mentions = await extractMentions(text);

    let parentComment = null;
    if (parentCommentId) {
      parentComment = await Comment.findOne({ _id: parentCommentId, isDeleted: false });
      if (!parentComment) {
        throw errors.notFound('Parent comment not found');
      }

      // Enforce max nesting level: replies to replies not allowed
      if (parentComment.parentComment) {
        throw errors.badRequest('Nested replies are restricted to a maximum depth of 2 levels');
      }
    }

    const newComment = new Comment({
      postId,
      author: authorId,
      text,
      parentComment: parentCommentId || null,
      mentions,
    });

    // Run AI Moderation (Phase 14)
    const moderationService = require('./moderationService');
    await moderationService.moderateComment(newComment);

    await newComment.save();

    // Increment stats atomically
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
    }
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    // Trigger Notification for Post Author (if not own post)
    if (post.author.toString() !== authorId) {
      try {
        const commentAuthor = await User.findById(authorId);
        const name = commentAuthor ? `${commentAuthor.firstName} ${commentAuthor.lastName}` : 'Someone';
        await notificationService.createNotification({
          userId: post.author,
          actorId: authorId,
          type: 'comment',
          postId,
          commentId: newComment._id,
          title: 'New Comment',
          message: `${name} commented on your post`,
          actionUrl: `/posts/${postId}`,
        });
      } catch (notifErr) {
        logger.logError('Failed to trigger post comment notification', notifErr, { postId, authorId });
      }
    }

    // Trigger Notification for Parent Comment Author if a reply (if not own comment)
    if (parentComment && parentComment.author.toString() !== authorId) {
      try {
        const replyAuthor = await User.findById(authorId);
        const name = replyAuthor ? `${replyAuthor.firstName} ${replyAuthor.lastName}` : 'Someone';
        await notificationService.createNotification({
          userId: parentComment.author,
          actorId: authorId,
          type: 'comment',
          postId,
          commentId: newComment._id,
          title: 'New Reply',
          message: `${name} replied to your comment`,
          actionUrl: `/posts/${postId}`,
        });
      } catch (notifErr) {
        logger.logError('Failed to trigger reply notification', notifErr, { parentCommentId, authorId });
      }
    }

    logger.logBusinessEvent('comment_created', authorId, {
      postId,
      commentId: newComment._id.toString(),
      isReply: !!parentCommentId,
    });

    // Log engagement for recommendation engine
    try {
      const Engagement = require('../models/Engagement');
      await Engagement.log(authorId, postId, 'comment');
      const aiService = require('./aiService');
      aiService.updateUserPreferences(authorId).catch((err) =>
        logger.warn('Failed to update preferences on comment', { userId: authorId, err: err.message })
      );
    } catch (engErr) {
      logger.warn('Failed to log engagement for comment creation', { postId, authorId, error: engErr.message });
    }

    feedService.invalidateFeedCache();
    await cache.clearPattern(`post:details:${postId}:*`);

    return await newComment.populate('author', 'username profilePicture firstName lastName');
  } catch (error) {
    logger.logError('Create comment service error', error, { postId, authorId });
    throw error;
  }
};

/**
 * Get paginated list of root comments for a post
 * @param {Object} params - Query params
 * @param {string} params.postId - Post ID
 * @param {number} params.page - Page number
 * @param {number} params.limit - Limit
 * @param {string} [params.currentUserId] - Authenticated user ID
 * @returns {Promise<Object>} Paginated comments list
 */
const getPostComments = async ({ postId, page = 1, limit = 20, currentUserId = null }) => {
  try {
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      postId,
      parentComment: null,
      isDeleted: false,
    })
      .populate('author', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({
      postId,
      parentComment: null,
      isDeleted: false,
    });

    // Check likes status for comments
    let likedCommentIds = [];
    if (currentUserId && comments.length > 0) {
      const commentIds = comments.map((c) => c._id);
      const likes = await Like.find({
        userId: currentUserId,
        commentId: { $in: commentIds },
        likeType: 'comment',
      });
      likedCommentIds = likes.map((l) => l.commentId.toString());
    }

    const data = comments.map((comment) => {
      const commentObj = comment.toObject();
      commentObj.isLiked = likedCommentIds.includes(comment._id.toString());
      return commentObj;
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.logError('Get post comments service error', error, { postId });
    throw error;
  }
};

/**
 * Get paginated list of replies to a comment
 * @param {Object} params - Query params
 * @param {string} params.commentId - Parent comment ID
 * @param {number} params.page - Page number
 * @param {number} params.limit - Limit
 * @param {string} [params.currentUserId] - Authenticated user ID
 * @returns {Promise<Object>} Paginated replies list
 */
const getCommentReplies = async ({ commentId, page = 1, limit = 20, currentUserId = null }) => {
  try {
    const skip = (page - 1) * limit;

    const replies = await Comment.find({
      parentComment: commentId,
      isDeleted: false,
    })
      .populate('author', 'username profilePicture firstName lastName')
      .sort({ createdAt: 1 }) // replies listed chronologically
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({
      parentComment: commentId,
      isDeleted: false,
    });

    // Check likes status
    let likedCommentIds = [];
    if (currentUserId && replies.length > 0) {
      const replyIds = replies.map((r) => r._id);
      const likes = await Like.find({
        userId: currentUserId,
        commentId: { $in: replyIds },
        likeType: 'comment',
      });
      likedCommentIds = likes.map((l) => l.commentId.toString());
    }

    const data = replies.map((reply) => {
      const replyObj = reply.toObject();
      replyObj.isLiked = likedCommentIds.includes(reply._id.toString());
      return replyObj;
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.logError('Get comment replies service error', error, { commentId });
    throw error;
  }
};

/**
 * Update an existing comment or reply
 * @param {string} commentId - Comment ID
 * @param {string} authorId - Requesting user ID
 * @param {string} text - Updated text
 * @returns {Promise<Object>} Updated comment
 */
const updateComment = async (commentId, authorId, text) => {
  try {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    if (!comment) {
      throw errors.notFound('Comment not found');
    }

    if (comment.author.toString() !== authorId) {
      throw errors.forbidden('You are not authorized to edit this comment');
    }

    comment.text = text;
    comment.mentions = await extractMentions(text);
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    logger.logBusinessEvent('comment_updated', authorId, { commentId });

    return await comment.populate('author', 'username profilePicture firstName lastName');
  } catch (error) {
    logger.logError('Update comment service error', error, { commentId, authorId });
    throw error;
  }
};

/**
 * Soft delete a comment and its replies (if root comment)
 * @param {string} commentId - Comment ID
 * @param {string} authorId - Requesting user ID
 * @returns {Promise<boolean>} Success state
 */
const deleteComment = async (commentId, authorId) => {
  try {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    if (!comment) {
      throw errors.notFound('Comment not found');
    }

    if (comment.author.toString() !== authorId) {
      throw errors.forbidden('You are not authorized to delete this comment');
    }

    comment.isDeleted = true;
    await comment.save();

    if (!comment.parentComment) {
      // Root comment deleted: soft-delete all replies and adjust post counter
      const activeReplies = await Comment.find({ parentComment: commentId, isDeleted: false });
      const activeRepliesCount = activeReplies.length;

      await Comment.updateMany({ parentComment: commentId }, { isDeleted: true });

      // Decrement post commentsCount by 1 (root) + repliesCount
      await Post.findByIdAndUpdate(comment.postId, {
        $inc: { commentsCount: -(1 + activeRepliesCount) },
      });
    } else {
      // Reply deleted: decrement parent comment repliesCount and post commentsCount
      await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { repliesCount: -1 } });
      await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
    }

    // Clean up notifications and likes
    try {
      await Notification.deleteMany({ comment: commentId });
      await Like.deleteMany({ commentId });
    } catch (cleanErr) {
      logger.logError('Failed to cleanup likes and notifications for deleted comment', cleanErr, { commentId });
    }

    logger.logBusinessEvent('comment_deleted', authorId, { commentId });

    feedService.invalidateFeedCache();
    await cache.clearPattern(`post:details:${comment.postId}:*`);

    return true;
  } catch (error) {
    logger.logError('Delete comment service error', error, { commentId, authorId });
    throw error;
  }
};

module.exports = {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
};
