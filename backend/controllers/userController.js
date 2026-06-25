/**
 * User Controller
 * Handles user profile, follow, and search operations
 */

const userService = require('../services/userService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');
const upload = require('../middlewares/upload');

/**
 * Get user profile
 * GET /api/users/:username
 * or
 * GET /api/users/:userId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const currentUserId = req.user?.id;

    // Get user by username or ID
    const user = await userService.getUserByIdentifier(username);

    // Get profile with stats
    const profile = await userService.getUserProfile(user._id.toString(), currentUserId);

    logger.logBusinessEvent('profile_viewed', currentUserId, {
      viewedUserId: user._id.toString(),
    });

    sendSuccess(res, profile, 'User profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * PUT /api/users/me/profile
 *
 * @param {Object} req - Express request
 * @param {string} req.body.firstName - First name
 * @param {string} req.body.lastName - Last name
 * @param {string} req.body.bio - Bio
 * @param {boolean} req.body.isPublic - Public profile flag
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const updateProfile = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { firstName, lastName, bio, isPublic, notificationsEnabled } = req.body;

    // Update profile
    const updatedUser = await userService.updateProfile(userId, {
      firstName,
      lastName,
      bio,
      isPublic,
      notificationsEnabled,
    });

    sendSuccess(res, {
      id: updatedUser._id,
      email: updatedUser.email,
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      bio: updatedUser.bio,
      isPublic: updatedUser.isPublic,
      notificationsEnabled: updatedUser.notificationsEnabled,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload profile picture
 * POST /api/users/me/profile-picture
 * 
 * Note: File upload handled by multer middleware
 *
 * @param {Object} req - Express request
 * @param {Object} req.file - Uploaded file
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const uploadProfilePicture = async (req, res, next) => {
  try {
    const { id: userId } = req.user;

    if (!req.file) {
      return next(errors.badRequest('No file uploaded'));
    }

    // Use upload.getFileUrl helper to support both local and Cloudinary storage
    const imageUrl = upload.getFileUrl(req.file);

    const updatedUser = await userService.updateProfilePicture(userId, imageUrl);

    sendSuccess(res, {
      profilePicture: updatedUser.profilePicture,
      message: 'Profile picture updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload cover image
 * POST /api/users/me/cover-image
 *
 * @param {Object} req - Express request
 * @param {Object} req.file - Uploaded file
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const uploadCoverImage = async (req, res, next) => {
  try {
    const { id: userId } = req.user;

    if (!req.file) {
      return next(errors.badRequest('No file uploaded'));
    }

    // Use upload.getFileUrl helper to support both local and Cloudinary storage
    const imageUrl = upload.getFileUrl(req.file);

    const updatedUser = await userService.updateCoverImage(userId, imageUrl);

    sendSuccess(res, {
      coverImage: updatedUser.coverImage,
      message: 'Cover image updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Follow a user
 * POST /api/users/:userId/follow
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const followUser = async (req, res, next) => {
  try {
    const { id: currentUserId } = req.user;
    const { userId } = req.params;

    await userService.followUser(currentUserId, userId);

    sendSuccess(res, null, 'User followed successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Unfollow a user
 * DELETE /api/users/:userId/follow
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const unfollowUser = async (req, res, next) => {
  try {
    const { id: currentUserId } = req.user;
    const { userId } = req.params;

    await userService.unfollowUser(currentUserId, userId);

    sendSuccess(res, null, 'User unfollowed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get followers list
 * GET /api/users/:userId/followers
 *
 * @param {Object} req - Express request
 * @param {number} req.query.page - Page number
 * @param {number} req.query.limit - Items per page
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page || 1);
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await userService.getFollowers(userId, page, limit);

    sendPaginated(res, result.data, result.pagination.page, result.pagination.limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
};

/**
 * Get following list
 * GET /api/users/:userId/following
 *
 * @param {Object} req - Express request
 * @param {number} req.query.page - Page number
 * @param {number} req.query.limit - Items per page
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page || 1);
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await userService.getFollowing(userId, page, limit);

    sendPaginated(res, result.data, result.pagination.page, result.pagination.limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
};

/**
 * Search users
 * GET /api/users/search?q=query
 *
 * @param {Object} req - Express request
 * @param {string} req.query.q - Search query
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    if (!q) {
      return next(errors.badRequest('Search query required'));
    }

    const results = await userService.searchUsers(q, limit);

    sendSuccess(res, results, 'Search results');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user suggestions
 * GET /api/users/suggestions
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const getUserSuggestions = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const limit = Math.min(parseInt(req.query.limit || 10), 50);

    const suggestions = await userService.getUserSuggestions(userId, limit);

    sendSuccess(res, suggestions, 'User suggestions');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  uploadProfilePicture,
  uploadCoverImage,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchUsers,
  getUserSuggestions,
};
