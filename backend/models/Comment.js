/**
 * Comment Model
 * Stores post comments and nested replies
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    // Relationships
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post ID is required'],
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },

    // Parent comment for nested replies
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },

    // Content
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },

    // Mentions
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Engagement
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Status
    isEdited: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // AI Moderation (Phase 14)
    moderationStatus: {
      type: String,
      enum: ['approved', 'flagged', 'pending_review'],
      default: 'approved',
      index: true,
    },

    moderationReason: {
      type: String,
      default: '',
    },

    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'comments',
  }
);

/**
 * Indexes for performance
 */
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ isDeleted: 1 });
commentSchema.index({ moderationStatus: 1 });

/**
 * Static method to find comments for a post
 * @param {string} postId - Post ID
 * @param {number} limit - Items to return
 * @param {number} skip - Items to skip
 * @returns {Promise<Array>} Array of comments
 */
commentSchema.statics.findByPost = function findByPost(postId, limit = 20, skip = 0) {
  return this.find({
    postId,
    parentComment: null, // Only root comments
    isDeleted: false,
  })
    .populate('author', 'username profilePicture firstName lastName')
    .populate('mentions', 'username')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to find replies to a comment
 * @param {string} commentId - Parent comment ID
 * @param {number} limit - Items to return
 * @returns {Promise<Array>} Array of replies
 */
commentSchema.statics.findReplies = function findReplies(commentId, limit = 10) {
  return this.find({
    parentComment: commentId,
    isDeleted: false,
  })
    .populate('author', 'username profilePicture firstName lastName')
    .populate('mentions', 'username')
    .sort({ createdAt: 1 })
    .limit(limit);
};

/**
 * Method to get comment with author details
 */
commentSchema.methods.toJSON = function toJSON() {
  return this.toObject();
};

module.exports = mongoose.model('Comment', commentSchema);
