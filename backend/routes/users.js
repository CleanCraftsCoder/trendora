/**
 * User Routes
 * Handles user profile, follow, and search operations
 */

const express = require('express');
const { authenticate, authenticateOptional } = require('../middlewares/auth');
const userController = require('../controllers/userController');
const { validateObjectId, validatePagination, validateUpdateUser, handleValidationErrors } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');
const upload = require('../middlewares/upload');

const router = express.Router();

/**
 * Public Routes
 */

/**
 * GET /api/users/search
 * Search users by username or name
 *
 * Query Parameters:
 * - q (required): Search query (min 2 chars)
 * - limit (optional): Results limit (1-50, default 20)
 *
 * Example: GET /api/users/search?q=john&limit=10
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "username": "johndoe",
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "profilePicture": "https://..."
 *     }
 *   ]
 * }
 */
router.get('/search', asyncHandler(userController.searchUsers));

/**
 * GET /api/users/suggestions
 * Get suggested users to follow
 *
 * Headers:
 * {
 *   "Authorization": "Bearer <accessToken>"
 * }
 *
 * Query Parameters:
 * - limit (optional): Number of suggestions (1-50, default 10)
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": [
 *     {
 *       "id": "507f1f77bcf86cd799439012",
 *       "username": "janedoe",
 *       "firstName": "Jane",
 *       "lastName": "Doe",
 *       "profilePicture": "https://..."
 *     }
 *   ]
 * }
 */
router.get(
  '/suggestions',
  authenticate,
  asyncHandler(userController.getUserSuggestions)
);

/**
 * GET /api/users/:username
 * Get user profile by username or ID
 *
 * Example: GET /api/users/johndoe
 *          GET /api/users/507f1f77bcf86cd799439011
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "email": "john@example.com",
 *     "username": "johndoe",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "bio": "Software Developer",
 *     "profilePicture": "https://...",
 *     "coverImage": "https://...",
 *     "isVerified": true,
 *     "isPublic": true,
 *     "stats": {
 *       "followersCount": 100,
 *       "followingCount": 50,
 *       "postsCount": 25
 *     },
 *     "isFollowing": false,
 *     "isFollowedBy": false,
 *     "createdAt": "2024-01-01T12:00:00Z"
 *   }
 * }
 */
router.get('/:username', asyncHandler(userController.getUserProfile));

/**
 * GET /api/users/:userId/followers
 * Get followers list for a user
 *
 * Query Parameters:
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (1-50, default 20)
 *
 * Example: GET /api/users/507f1f77bcf86cd799439011/followers?page=1&limit=20
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": [
 *     {
 *       "id": "507f1f77bcf86cd799439012",
 *       "username": "janedoe",
 *       "firstName": "Jane",
 *       "lastName": "Doe",
 *       "profilePicture": "https://..."
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 100,
 *     "pages": 5,
 *     "hasNextPage": true,
 *     "hasPrevPage": false
 *   }
 * }
 */
router.get(
  '/:userId/followers',
  validatePagination,
  handleValidationErrors,
  asyncHandler(userController.getFollowers)
);

/**
 * GET /api/users/:userId/following
 * Get following list for a user
 *
 * Query Parameters:
 * - page (optional): Page number (default 1)
 * - limit (optional): Items per page (1-50, default 20)
 *
 * Example: GET /api/users/507f1f77bcf86cd799439011/following?page=1
 *
 * Response: Same structure as /followers
 */
router.get(
  '/:userId/following',
  validatePagination,
  handleValidationErrors,
  asyncHandler(userController.getFollowing)
);

/**
 * Protected Routes (Require Authentication)
 */

/**
 * PUT /api/users/me/profile
 * Update current user profile
 *
 * Headers:
 * {
 *   "Authorization": "Bearer <accessToken>",
 *   "Content-Type": "application/json"
 * }
 *
 * Request Body:
 * {
 *   "firstName": "John",
 *   "lastName": "Doe",
 *   "bio": "Software Developer | Tech Enthusiast",
 *   "isPublic": true,
 *   "notificationsEnabled": true
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "email": "john@example.com",
 *     "username": "johndoe",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "bio": "Software Developer | Tech Enthusiast",
 *     "isPublic": true,
 *     "notificationsEnabled": true
 *   }
 * }
 */
router.put(
  '/me/profile',
  authenticate,
  validateUpdateUser,
  handleValidationErrors,
  asyncHandler(userController.updateProfile)
);

/**
 * POST /api/users/me/profile-picture
 * Upload profile picture
 *
 * Headers:
 * {
 *   "Authorization": "Bearer <accessToken>",
 *   "Content-Type": "multipart/form-data"
 * }
 *
 * Form Data:
 * - profilePicture: File (image, max 5MB)
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": {
 *     "profilePicture": "/uploads/profile-pictures/filename.jpg"
 *   },
 *   "message": "Profile picture updated successfully"
 * }
 */
router.post(
  '/me/profile-picture',
  authenticate,
  upload.single('profilePicture'),
  asyncHandler(userController.uploadProfilePicture)
);

/**
 * POST /api/users/me/cover-image
 * Upload cover image
 *
 * Headers:
 * {
 *   "Authorization": "Bearer <accessToken>",
 *   "Content-Type": "multipart/form-data"
 * }
 *
 * Form Data:
 * - coverImage: File (image, max 5MB)
 *
 * Response: Similar to profile-picture upload
 */
router.post(
  '/me/cover-image',
  authenticate,
  upload.single('coverImage'),
  asyncHandler(userController.uploadCoverImage)
);

/**
 * POST /api/users/:userId/follow
 * Follow a user
 *
 * Headers:
 * {
 *   "Authorization": "Bearer <accessToken>"
 * }
 *
 * URL Parameters:
 * - userId: User ID to follow
 *
 * Example: POST /api/users/507f1f77bcf86cd799439012/follow
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 201,
 *   "data": null,
 *   "message": "User followed successfully"
 * }
 */
router.post(
  '/:userId/follow',
  authenticate,
  ...validateObjectId('userId'),
  handleValidationErrors,
  asyncHandler(userController.followUser)
);

/**
 * DELETE /api/users/:userId/follow
 * Unfollow a user
 *
 * Headers:
 * {
 *   "Authorization": "Bearer <accessToken>"
 * }
 *
 * URL Parameters:
 * - userId: User ID to unfollow
 *
 * Example: DELETE /api/users/507f1f77bcf86cd799439012/follow
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": null,
 *   "message": "User unfollowed successfully"
 * }
 */
router.delete(
  '/:userId/follow',
  authenticate,
  ...validateObjectId('userId'),
  handleValidationErrors,
  asyncHandler(userController.unfollowUser)
);

module.exports = router;
