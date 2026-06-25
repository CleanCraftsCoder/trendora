/**
 * User Service
 * Business logic for user operations
 */

const User = require('../models/User');
const Follow = require('../models/Follow');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const feedService = require('./feedService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');
const { errors } = require('../middlewares/errorHandler');
const cache = require('../utils/cache');

/**
 * Update user profile
 * @param {string} userId - User ID to update
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated user document
 */
const updateProfile = async (userId, updateData) => {
  try {
    // Fields that are allowed to be updated
    const allowedUpdates = [
      'firstName',
      'lastName',
      'bio',
      'isPublic',
      'notificationsEnabled',
    ];

    // Filter to only allowed fields
    const filteredData = {};
    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Update user
    const user = await User.findByIdAndUpdate(userId, filteredData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw errors.notFound('User not found');
    }

    await cache.clearPattern(`user:profile:${userId}:*`);

    logger.logBusinessEvent('profile_updated', userId, {
      fields: Object.keys(filteredData),
    });

    return user;
  } catch (error) {
    if (error.name === 'ValidationError') {
      logger.logError('Profile update validation error', error, { userId });
      throw errors.badRequest('Invalid profile data');
    }
    throw error;
  }
};

/**
 * Update user profile picture
 * @param {string} userId - User ID
 * @param {string} imageUrl - Image URL
 * @returns {Promise<Object>} Updated user
 */
const updateProfilePicture = async (userId, imageUrl) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: imageUrl },
      { new: true }
    );

    if (!user) {
      throw errors.notFound('User not found');
    }

    await cache.clearPattern(`user:profile:${userId}:*`);

    logger.logBusinessEvent('profile_picture_updated', userId, {
      imageUrl,
    });

    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user cover image
 * @param {string} userId - User ID
 * @param {string} imageUrl - Image URL
 * @returns {Promise<Object>} Updated user
 */
const updateCoverImage = async (userId, imageUrl) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { coverImage: imageUrl },
      { new: true }
    );

    if (!user) {
      throw errors.notFound('User not found');
    }

    await cache.clearPattern(`user:profile:${userId}:*`);

    logger.logBusinessEvent('cover_image_updated', userId, {
      imageUrl,
    });

    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user by ID or username
 * @param {string} identifier - User ID or username
 * @returns {Promise<Object>} User document
 */
const getUserByIdentifier = async (identifier) => {
  try {
    let user;

    // Check if identifier is MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      user = await User.findById(identifier);
    } else {
      // Assume it's username
      user = await User.findOne({
        username: identifier.toLowerCase(),
      });
    }

    if (!user) {
      throw errors.notFound('User not found');
    }

    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Get user profile with stats
 * @param {string} userId - User ID to fetch
 * @param {string} currentUserId - Current authenticated user ID (optional)
 * @returns {Promise<Object>} User profile with stats
 */
const getUserProfile = async (userId, currentUserId = null) => {
  const cacheKey = `user:profile:${userId}:${currentUserId || 'guest'}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  try {
    const user = await User.findById(userId);

    if (!user) {
      throw errors.notFound('User not found');
    }

    // Prepare response data
    const profileData = {
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profilePicture: user.profilePicture,
      coverImage: user.coverImage,
      isVerified: user.isVerified,
      isPublic: user.isPublic,
      stats: {
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
      },
      createdAt: user.createdAt,
    };

    // Check follow status if current user provided
    if (currentUserId && currentUserId !== userId.toString()) {
      const isFollowing = await Follow.isFollowing(currentUserId, userId);
      const isFollowedBy = await Follow.isFollowing(userId, currentUserId);

      profileData.isFollowing = isFollowing;
      profileData.isFollowedBy = isFollowedBy;
    }

    await cache.set(cacheKey, profileData, 3600); // Cache for 1 hour

    return profileData;
  } catch (error) {
    throw error;
  }
};

/**
 * Follow a user
 * @param {string} followerId - User ID of follower
 * @param {string} followingId - User ID to follow
 * @returns {Promise<Object>} Created follow document
 */
const followUser = async (followerId, followingId) => {
  try {
    // Check if user exists
    const userToFollow = await User.findById(followingId);
    if (!userToFollow) {
      throw errors.notFound('User to follow not found');
    }

    // Prevent self-following
    if (followerId === followingId) {
      throw errors.badRequest('Cannot follow yourself');
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      followerId,
      followingId,
    });

    if (existingFollow) {
      throw errors.conflict('Already following this user');
    }

    // Create follow relationship
    const followRecord = new Follow({
      followerId,
      followingId,
      status: 'accepted',
    });

    await followRecord.save();

    // Increment follower counts
    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: 1 },
    });

    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: 1 },
    });

    // Create notification
    try {
      const followerUser = await User.findById(followerId);
      const name = followerUser ? `${followerUser.firstName} ${followerUser.lastName}` : 'Someone';
      await notificationService.createNotification({
        userId: followingId,
        actorId: followerId,
        type: 'follow',
        title: 'New Follower',
        message: `${name} started following you`,
        actionUrl: `/profile/${followerUser?.username || followerId}`,
      });
    } catch (notifErr) {
      logger.logError('Failed to create notification for follow event', notifErr, { followerId, followingId });
    }

    // Invalidate profile caches for both follower and following users
    await cache.clearPattern(`user:profile:${followerId}:*`);
    await cache.clearPattern(`user:profile:${followingId}:*`);
    await feedService.invalidateFeedCache();

    logger.logBusinessEvent('user_followed', followerId, {
      followingId: followingId.toString(),
    });

    return followRecord;
  } catch (error) {
    throw error;
  }
};

/**
 * Unfollow a user
 * @param {string} followerId - User ID of follower
 * @param {string} followingId - User ID to unfollow
 * @returns {Promise<Object>} Delete result
 */
const unfollowUser = async (followerId, followingId) => {
  try {
    // Check if following
    const followRecord = await Follow.findOne({
      followerId,
      followingId,
    });

    if (!followRecord) {
      throw errors.notFound('Not following this user');
    }

    // Delete follow relationship
    await Follow.deleteOne({
      followerId,
      followingId,
    });

    // Decrement follower counts
    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 },
    });

    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: -1 },
    });

    // Delete notification if exists
    try {
      await Notification.deleteOne({
        userId: followingId,
        actor: followerId,
        type: 'follow',
      });
    } catch (notifErr) {
      logger.logError('Failed to delete notification for unfollow event', notifErr, { followerId, followingId });
    }

    // Invalidate profile caches for both follower and unfollowed users
    await cache.clearPattern(`user:profile:${followerId}:*`);
    await cache.clearPattern(`user:profile:${followingId}:*`);
    await feedService.invalidateFeedCache();

    logger.logBusinessEvent('user_unfollowed', followerId, {
      followingId: followingId.toString(),
    });

    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Get followers list for a user
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Array>} Array of followers
 */
const getFollowers = async (userId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;

    const followers = await Follow.getFollowers(userId, limit, skip);

    const total = await Follow.countDocuments({
      followingId: userId,
      status: 'accepted',
    });

    return {
      data: followers.map((f) => ({
        id: f.followerId._id,
        username: f.followerId.username,
        firstName: f.followerId.firstName,
        lastName: f.followerId.lastName,
        profilePicture: f.followerId.profilePicture,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get following list for a user
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Array>} Array of following
 */
const getFollowing = async (userId, page = 1, limit = 20) => {
  try {
    const skip = (page - 1) * limit;

    const following = await Follow.getFollowing(userId, limit, skip);

    const total = await Follow.countDocuments({
      followerId: userId,
      status: 'accepted',
    });

    return {
      data: following.map((f) => ({
        id: f.followingId._id,
        username: f.followingId.username,
        firstName: f.followingId.firstName,
        lastName: f.followingId.lastName,
        profilePicture: f.followingId.profilePicture,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Search users by username or name
 * @param {string} query - Search query
 * @param {number} limit - Results limit
 * @returns {Promise<Array>} Array of matching users
 */
const searchUsers = async (query, limit = 20) => {
  try {
    if (!query || query.length < 2) {
      throw errors.badRequest('Search query must be at least 2 characters');
    }

    // Create case-insensitive regex
    const regex = new RegExp(query, 'i');

    // Search in username, firstName, lastName
    const users = await User.find({
      $or: [
        { username: { $regex: regex } },
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
      ],
    })
      .select('username firstName lastName profilePicture')
      .limit(limit);

    return users.map((u) => ({
      id: u._id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      profilePicture: u.profilePicture,
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get user suggestions (recommended users to follow)
 * @param {string} userId - Current user ID
 * @param {number} limit - Number of suggestions
 * @returns {Promise<Array>} Array of suggested users
 */
const getUserSuggestions = async (userId, limit = 10) => {
  try {
    // Get list of users this person is following
    const followingIds = await Follow.getFollowingIds(userId);
    const followingList = followingIds.map((f) => f.followingId);

    // Find users not yet followed (excluding self)
    const suggestions = await User.find({
      _id: {
        $nin: [...followingList, userId],
      },
    })
      .select('username firstName lastName profilePicture')
      .sort({ followersCount: -1 }) // Popular users first
      .limit(limit);

    return suggestions.map((u) => ({
      id: u._id,
      username: u.username,
      firstName: u.firstName,
      lastName: u.lastName,
      profilePicture: u.profilePicture,
    }));
  } catch (error) {
    throw error;
  }
};

module.exports = {
  updateProfile,
  updateProfilePicture,
  updateCoverImage,
  getUserByIdentifier,
  getUserProfile,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchUsers,
  getUserSuggestions,
};
