const Like = require('../models/Like');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const feedService = require('./feedService');
const notificationService = require('./notificationService');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

/**
 * Like a post
 * @param {string} postId - Post ID
 * @param {string} userId - User ID who likes the post
 * @returns {Promise<Object>} Object with postId, isLiked, and likesCount
 */
const likePost = async (postId, userId) => {
  try {
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      throw errors.notFound('Post not found');
    }

    // Check if user already liked the post
    const alreadyLiked = await Like.hasUserLikedPost(userId, postId);
    if (alreadyLiked) {
      throw errors.conflict('Post already liked');
    }

    // Create Like document
    const newLike = new Like({
      userId,
      postId,
      likeType: 'post',
    });
    await newLike.save();

    // Increment likesCount and push user to likes array in Post document
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $addToSet: { likes: userId },
        $inc: { likesCount: 1 },
      },
      { new: true }
    );

    // Create Notification if not liking own post
    if (post.author.toString() !== userId) {
      try {
        const liker = await User.findById(userId);
        const name = liker ? `${liker.firstName} ${liker.lastName}` : 'Someone';
        await notificationService.createNotification({
          userId: post.author,
          actorId: userId,
          type: 'like',
          postId: post._id,
          title: 'Post Liked',
          message: `${name} liked your post`,
          actionUrl: `/posts/${post._id}`,
        });
      } catch (notifErr) {
        logger.logError('Failed to create notification for post like', notifErr, { postId, userId });
      }
    }

    logger.logBusinessEvent('post_liked', userId, {
      postId,
      likesCount: updatedPost.likesCount,
    });

    // Log engagement for recommendation engine
    try {
      const Engagement = require('../models/Engagement');
      await Engagement.log(userId, postId, 'like');
      const aiService = require('./aiService');
      aiService.updateUserPreferences(userId).catch((err) =>
        logger.warn('Failed to update preferences on like', { userId, err: err.message })
      );
    } catch (engErr) {
      logger.warn('Failed to log engagement for post like', { postId, userId, error: engErr.message });
    }

    feedService.invalidateFeedCache();
    await cache.clearPattern(`post:details:${postId}:*`);

    return {
      postId,
      isLiked: true,
      likesCount: updatedPost.likesCount,
    };
  } catch (error) {
    logger.logError('Like post service error', error, { postId, userId });
    throw error;
  }
};

/**
 * Unlike a post
 * @param {string} postId - Post ID
 * @param {string} userId - User ID who unlikes the post
 * @returns {Promise<Object>} Object with postId, isLiked, and likesCount
 */
const unlikePost = async (postId, userId) => {
  try {
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      throw errors.notFound('Post not found');
    }

    // Delete Like document
    const deletedLike = await Like.findOneAndDelete({
      userId,
      postId,
      likeType: 'post',
    });

    if (!deletedLike) {
      throw errors.notFound('Like not found');
    }

    // Decrement likesCount and pull user from likes array in Post document
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        $pull: { likes: userId },
        $inc: { likesCount: -1 },
      },
      { new: true }
    );

    // Remove notification if applicable
    try {
      await Notification.deleteOne({
        userId: post.author,
        actor: userId,
        type: 'like',
        post: postId,
      });
    } catch (notifErr) {
      logger.logError('Failed to delete notification for post unlike', notifErr, { postId, userId });
    }

    logger.logBusinessEvent('post_unliked', userId, {
      postId,
      likesCount: updatedPost.likesCount,
    });

    // Log engagement removal for recommendation engine
    try {
      const Engagement = require('../models/Engagement');
      await Engagement.deleteOne({ userId, postId, interactionType: 'like' });
      const aiService = require('./aiService');
      aiService.updateUserPreferences(userId).catch((err) =>
        logger.warn('Failed to update preferences on unlike', { userId, err: err.message })
      );
    } catch (engErr) {
      logger.warn('Failed to delete engagement for post unlike', { postId, userId, error: engErr.message });
    }

    feedService.invalidateFeedCache();
    await cache.clearPattern(`post:details:${postId}:*`);

    return {
      postId,
      isLiked: false,
      likesCount: updatedPost.likesCount,
    };
  } catch (error) {
    logger.logError('Unlike post service error', error, { postId, userId });
    throw error;
  }
};

/**
 * Like a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID who likes the comment
 * @returns {Promise<Object>} Object with commentId, isLiked, and likesCount
 */
const likeComment = async (commentId, userId) => {
  try {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    if (!comment) {
      throw errors.notFound('Comment not found');
    }

    // Check if user already liked the comment
    const alreadyLiked = await Like.hasUserLikedComment(userId, commentId);
    if (alreadyLiked) {
      throw errors.conflict('Comment already liked');
    }

    // Create Like document
    const newLike = new Like({
      userId,
      commentId,
      likeType: 'comment',
    });
    await newLike.save();

    // Increment likesCount and push user to likes array in Comment document
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $addToSet: { likes: userId },
        $inc: { likesCount: 1 },
      },
      { new: true }
    );

    // Create Notification if not liking own comment
    if (comment.author.toString() !== userId) {
      try {
        const liker = await User.findById(userId);
        const name = liker ? `${liker.firstName} ${liker.lastName}` : 'Someone';
        await notificationService.createNotification({
          userId: comment.author,
          actorId: userId,
          type: 'like',
          postId: comment.postId,
          commentId: comment._id,
          title: 'Comment Liked',
          message: `${name} liked your comment`,
          actionUrl: `/posts/${comment.postId}`,
        });
      } catch (notifErr) {
        logger.logError('Failed to create notification for comment like', notifErr, { commentId, userId });
      }
    }

    logger.logBusinessEvent('comment_liked', userId, {
      commentId,
      likesCount: updatedComment.likesCount,
    });

    return {
      commentId,
      isLiked: true,
      likesCount: updatedComment.likesCount,
    };
  } catch (error) {
    logger.logError('Like comment service error', error, { commentId, userId });
    throw error;
  }
};

/**
 * Unlike a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID who unlikes the comment
 * @returns {Promise<Object>} Object with commentId, isLiked, and likesCount
 */
const unlikeComment = async (commentId, userId) => {
  try {
    const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
    if (!comment) {
      throw errors.notFound('Comment not found');
    }

    // Delete Like document
    const deletedLike = await Like.findOneAndDelete({
      userId,
      commentId,
      likeType: 'comment',
    });

    if (!deletedLike) {
      throw errors.notFound('Like not found');
    }

    // Decrement likesCount and pull user from likes array in Comment document
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      {
        $pull: { likes: userId },
        $inc: { likesCount: -1 },
      },
      { new: true }
    );

    // Remove notification if applicable
    try {
      await Notification.deleteOne({
        userId: comment.author,
        actor: userId,
        type: 'like',
        comment: commentId,
      });
    } catch (notifErr) {
      logger.logError('Failed to delete notification for comment unlike', notifErr, { commentId, userId });
    }

    logger.logBusinessEvent('comment_unliked', userId, {
      commentId,
      likesCount: updatedComment.likesCount,
    });

    return {
      commentId,
      isLiked: false,
      likesCount: updatedComment.likesCount,
    };
  } catch (error) {
    logger.logError('Unlike comment service error', error, { commentId, userId });
    throw error;
  }
};

module.exports = {
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
};
