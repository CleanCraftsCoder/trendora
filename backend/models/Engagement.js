/**
 * Engagement Model
 * Tracks user interactions with posts to feed recommendation model
 */

const mongoose = require('mongoose');

const engagementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post ID is required'],
      index: true,
    },

    interactionType: {
      type: String,
      enum: ['view', 'click', 'like', 'comment', 'share'],
      required: [true, 'Interaction type is required'],
    },

    score: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'engagements',
  }
);

// Compound index to quickly find if a user interacted with a post
engagementSchema.index({ userId: 1, postId: 1, interactionType: 1 });
engagementSchema.index({ createdAt: -1 });

// Helper to determine score on save
engagementSchema.pre('save', function (next) {
  const scores = {
    view: 1,
    click: 3,
    like: 10,
    comment: 15,
    share: 20,
  };
  this.score = scores[this.interactionType] || 1;
  next();
});

/**
 * Static method to log an engagement
 * @param {string} userId - User ID
 * @param {string} postId - Post ID
 * @param {string} interactionType - Type of interaction
 * @returns {Promise<Object>} Created engagement document
 */
engagementSchema.statics.log = async function (userId, postId, interactionType) {
  // To avoid duplicate heavy scores (like logging multiple likes or comments on the same post),
  // we check if it is unique for single-time interactions, but allow multiple views/clicks
  if (['like', 'comment'].includes(interactionType)) {
    const existing = await this.findOne({ userId, postId, interactionType });
    if (existing) return existing;
  }

  const engagement = new this({
    userId,
    postId,
    interactionType,
  });

  return engagement.save();
};

module.exports = mongoose.model('Engagement', engagementSchema);
