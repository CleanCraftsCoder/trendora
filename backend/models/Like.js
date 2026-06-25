/**
 * Like Model
 * Tracks likes for posts and comments
 */

const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    // Relationships
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      index: true,
    },

    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      index: true,
    },

    // Type
    likeType: {
      type: String,
      enum: ['post', 'comment'],
      required: [true, 'Like type is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'likes',
  }
);

/**
 * Indexes for performance
 * Compound unique index to prevent duplicate likes
 */
likeSchema.index(
  {
    userId: 1,
    postId: 1,
  },
  {
    unique: true,
    sparse: true,
    name: 'unique_user_post_like',
  }
);

likeSchema.index(
  {
    userId: 1,
    commentId: 1,
  },
  {
    unique: true,
    sparse: true,
    name: 'unique_user_comment_like',
  }
);

likeSchema.index({ postId: 1 });
likeSchema.index({ commentId: 1 });
likeSchema.index({ userId: 1, createdAt: -1 });

/**
 * Pre-save validation
 * Ensures either postId or commentId is set, but not both
 */
likeSchema.pre('save', function validateLike(next) {
  const hasPostId = this.postId && this.postId.toString() !== '';
  const hasCommentId = this.commentId && this.commentId.toString() !== '';

  if (!hasPostId && !hasCommentId) {
    next(new Error('Either postId or commentId must be provided'));
  } else if (hasPostId && hasCommentId) {
    next(new Error('Cannot like both post and comment'));
  } else {
    next();
  }
});

/**
 * Static method to check if user liked a post
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @returns {Promise<boolean>} Whether user liked the post
 */
likeSchema.statics.hasUserLikedPost = async function hasUserLikedPost(userId, postId) {
  const like = await this.findOne({
    userId,
    postId,
    likeType: 'post',
  });
  return !!like;
};

/**
 * Static method to check if user liked a comment
 * @param {string} userId - User ID
 * @param {string} commentId - Comment ID
 * @returns {Promise<boolean>} Whether user liked the comment
 */
likeSchema.statics.hasUserLikedComment = async function hasUserLikedComment(
  userId,
  commentId
) {
  const like = await this.findOne({
    userId,
    commentId,
    likeType: 'comment',
  });
  return !!like;
};

/**
 * Static method to get likes for a post
 * @param {string} postId - Post ID
 * @param {number} limit - Items to return
 * @returns {Promise<Array>} Array of users who liked the post
 */
likeSchema.statics.findPostLikes = function findPostLikes(postId, limit = 50) {
  return this.find({ postId, likeType: 'post' })
    .populate('userId', 'username profilePicture firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Static method to get likes for a comment
 * @param {string} commentId - Comment ID
 * @param {number} limit - Items to return
 * @returns {Promise<Array>} Array of users who liked the comment
 */
likeSchema.statics.findCommentLikes = function findCommentLikes(commentId, limit = 50) {
  return this.find({ commentId, likeType: 'comment' })
    .populate('userId', 'username profilePicture firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Like', likeSchema);
