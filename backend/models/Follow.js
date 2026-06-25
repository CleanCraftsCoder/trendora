/**
 * Follow Model
 * Tracks user follow relationships
 */

const mongoose = require('mongoose');

const followSchema = new mongoose.Schema(
  {
    // Relationships
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Follower ID is required'],
      index: true,
    },

    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Following ID is required'],
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'accepted', 'blocked'],
      default: 'accepted',
    },
  },
  {
    timestamps: true,
    collection: 'follows',
  }
);

/**
 * Indexes for performance
 */
// Unique compound index to prevent duplicate follows
followSchema.index(
  {
    followerId: 1,
    followingId: 1,
  },
  {
    unique: true,
    name: 'unique_follow_relationship',
  }
);

followSchema.index({ followingId: 1 });
followSchema.index({ followerId: 1 });
followSchema.index({ createdAt: -1 });
followSchema.index({ status: 1 });

/**
 * Pre-save validation
 * Ensure user doesn't follow themselves
 */
followSchema.pre('save', function validateFollow(next) {
  if (this.followerId.toString() === this.followingId.toString()) {
    next(new Error('User cannot follow themselves'));
  } else {
    next();
  }
});

/**
 * Static method to check if user is following another user
 * @param {string} followerId - Follower user ID
 * @param {string} followingId - Following user ID
 * @returns {Promise<boolean>} Whether user is following
 */
followSchema.statics.isFollowing = async function isFollowing(followerId, followingId) {
  const follow = await this.findOne({
    followerId,
    followingId,
    status: 'accepted',
  });
  return !!follow;
};

/**
 * Static method to get user's followers
 * @param {string} userId - User ID
 * @param {number} limit - Items to return
 * @param {number} skip - Items to skip
 * @returns {Promise<Array>} Array of followers
 */
followSchema.statics.getFollowers = function getFollowers(userId, limit = 20, skip = 0) {
  return this.find({
    followingId: userId,
    status: 'accepted',
  })
    .populate('followerId', 'username profilePicture firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get user's following
 * @param {string} userId - User ID
 * @param {number} limit - Items to return
 * @param {number} skip - Items to skip
 * @returns {Promise<Array>} Array of following
 */
followSchema.statics.getFollowing = function getFollowing(userId, limit = 20, skip = 0) {
  return this.find({
    followerId: userId,
    status: 'accepted',
  })
    .populate('followingId', 'username profilePicture firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Static method to get count of followers
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of followers
 */
followSchema.statics.getFollowersCount = function getFollowersCount(userId) {
  return this.countDocuments({
    followingId: userId,
    status: 'accepted',
  });
};

/**
 * Static method to get count of following
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of following
 */
followSchema.statics.getFollowingCount = function getFollowingCount(userId) {
  return this.countDocuments({
    followerId: userId,
    status: 'accepted',
  });
};

/**
 * Static method to get list of IDs that user is following
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of user IDs
 */
followSchema.statics.getFollowingIds = function getFollowingIds(userId) {
  return this.find({
    followerId: userId,
    status: 'accepted',
  }).select('followingId').lean();
};

module.exports = mongoose.model('Follow', followSchema);
