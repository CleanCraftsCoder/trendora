/**
 * Authentication Routes
 * Handles all authentication related endpoints
 */

const express = require('express');
const { authenticate, authenticateRefreshToken } = require('../middlewares/auth');
const authController = require('../controllers/authController');
const {
  handleValidationErrors,
  validateRegister,
  validateLogin,
} = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * Public Routes
 */

/**
 * POST /api/auth/register
 * Register a new user
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "username": "johndoe",
 *   "password": "SecurePass123!",
 *   "firstName": "John",
 *   "lastName": "Doe"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 201,
 *   "data": {
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "email": "user@example.com",
 *       "username": "johndoe",
 *       "firstName": "John",
 *       "lastName": "Doe"
 *     },
 *     "tokens": {
 *       "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *       "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 *     }
 *   },
 *   "message": "User registered successfully",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post(
  '/register',
  validateRegister,
  handleValidationErrors,
  asyncHandler(authController.register)
);

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": {
 *     "user": {
 *       "id": "507f1f77bcf86cd799439011",
 *       "email": "user@example.com",
 *       "username": "johndoe",
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "profilePicture": "https://..."
 *     },
 *     "tokens": {
 *       "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *       "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 *     }
 *   },
 *   "message": "User logged in successfully",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  asyncHandler(authController.login)
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * Request Body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": {
 *     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
 *     "expiresIn": "15m"
 *   },
 *   "message": "Token refreshed successfully",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post(
  '/refresh',
  asyncHandler(authenticateRefreshToken),
  asyncHandler(authController.refreshAccessToken)
);

/**
 * POST /api/auth/forgot-password
 * Request password reset link
 *
 * Request Body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": null,
 *   "message": "If email exists, reset link will be sent",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post('/forgot-password', asyncHandler(authController.forgotPassword));

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 *
 * Request Body:
 * {
 *   "token": "verification_token_hash"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": null,
 *   "message": "Email verified successfully",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post('/verify-email', asyncHandler(authController.verifyEmail));

/**
 * Protected Routes (Require Authentication)
 */

/**
 * GET /api/auth/me
 * Get current authenticated user
 *
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "email": "user@example.com",
 *     "username": "johndoe",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "bio": "Software Developer",
 *     "profilePicture": "https://...",
 *     "coverImage": "https://...",
 *     "isVerified": true,
 *     "isPublic": true,
 *     "followersCount": 100,
 *     "followingCount": 50,
 *     "postsCount": 25,
 *     "createdAt": "2024-01-01T12:00:00Z"
 *   },
 *   "message": "User data retrieved successfully",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));

/**
 * POST /api/auth/logout
 * Logout user and invalidate tokens
 *
 * Headers:
 * {
 *   "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "status": 200,
 *   "data": null,
 *   "message": "Logged out successfully",
 *   "timestamp": "2024-01-01T12:00:00Z"
 * }
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));

module.exports = router;
