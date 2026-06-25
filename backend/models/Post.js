/**
 * Post Model
 * Stores user posts and content
 */

const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    // Content
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },

    caption: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },

    images: [
      {
        type: String,
        required: true,
      },
    ],

    // Engagement Stats (Denormalized for performance)
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

    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    sharesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metadata
    hashtags: [
      {
        type: String,
        index: true,
      },
    ],

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    location: {
      name: {
        type: String,
        default: '',
      },
      coordinates: {
        type: pointSchema,
        required: false,
      },
    },

    // Privacy & Status
    visibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'public',
    },

    isArchived: {
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

    // AI Data (for future recommendations)
    embeddings: [Number],
  },
  {
    timestamps: true,
    collection: 'posts',
  }
);

/**
 * Indexes for performance
 */
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ likes: 1 });
postSchema.index({ 'location.coordinates': '2dsphere' });
postSchema.index({ isDeleted: 1 });
postSchema.index({ moderationStatus: 1 });

/**
 * Method to convert post to JSON (exclude sensitive data)
 */
postSchema.methods.toJSON = function toJSON() {
  return this.toObject();
};

/**
 * Static method to find posts by author
 * @param {string} authorId - Author ID
 * @param {number} limit - Items to return
 * @param {number} skip - Items to skip
 * @returns {Promise<Array>} Array of posts
 */
postSchema.statics.findByAuthor = function findByAuthor(authorId, limit = 20, skip = 0) {
  return this.find({ author: authorId, isDeleted: false })
    .populate('author', 'username profilePicture firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to find trending posts
 * @param {number} limit - Items to return
 * @returns {Promise<Array>} Array of trending posts
 */
postSchema.statics.findTrending = function findTrending(limit = 20) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return this.find({
    createdAt: { $gte: sevenDaysAgo },
    isDeleted: false,
    visibility: 'public',
  })
    .sort({ likesCount: -1, commentsCount: -1, createdAt: -1 })
    .limit(limit)
    .populate('author', 'username profilePicture firstName lastName');
};

module.exports = mongoose.model('Post', postSchema);
