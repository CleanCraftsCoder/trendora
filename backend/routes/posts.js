/**
 * Post Routes
 * Handles post CRUD operations and feed queries
 */

const express = require('express');
const { authenticate, authenticateOptional } = require('../middlewares/auth');
const postController = require('../controllers/postController');
const likeController = require('../controllers/likeController');
const commentController = require('../controllers/commentController');
const aiController = require('../controllers/aiController');
const upload = require('../middlewares/upload');
const { validateObjectId, validatePagination, validateCreatePost, validateUpdatePost, validateCreateComment, handleValidationErrors } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @route   POST /api/posts
 * @desc    Create a new post with multiple images (1-10)
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  upload.array('images', 10),
  validateCreatePost,
  handleValidationErrors,
  asyncHandler(postController.createPost)
);

/**
 * @route   POST /api/posts/generate-caption
 * @desc    Generate AI captions from an uploaded image
 * @access  Private
 */
router.post(
  '/generate-caption',
  authenticate,
  upload.single('image'),
  asyncHandler(aiController.generateCaption)
);

/**
 * @route   POST /api/posts/generate-hashtags
 * @desc    Generate AI hashtags from caption text
 * @access  Private
 */
router.post(
  '/generate-hashtags',
  authenticate,
  asyncHandler(aiController.generateHashtags)
);

/**
 * @route   GET /api/posts
 * @desc    Get a scrollable list of posts (general feed or user profile posts)
 * @access  Public (Optional Auth)
 */
router.get(
  '/',
  authenticateOptional,
  validatePagination,
  handleValidationErrors,
  asyncHandler(postController.getPosts)
);

/**
 * @route   GET /api/posts/:postId
 * @desc    Get details of a single post
 * @access  Public (Optional Auth)
 */
router.get(
  '/:postId',
  authenticateOptional,
  ...validateObjectId('postId'),
  handleValidationErrors,
  asyncHandler(postController.getPostDetails)
);

/**
 * @route   PUT /api/posts/:postId
 * @desc    Update post caption and/or visibility
 * @access  Private
 */
router.put(
  '/:postId',
  authenticate,
  ...validateObjectId('postId'),
  validateUpdatePost,
  handleValidationErrors,
  asyncHandler(postController.updatePost)
);

/**
 * @route   DELETE /api/posts/:postId
 * @desc    Soft delete a post
 * @access  Private
 */
router.delete(
  '/:postId',
  authenticate,
  ...validateObjectId('postId'),
  handleValidationErrors,
  asyncHandler(postController.deletePost)
);

/**
 * @route   POST /api/posts/:postId/like
 * @desc    Like a post
 * @access  Private
 */
router.post(
  '/:postId/like',
  authenticate,
  ...validateObjectId('postId'),
  handleValidationErrors,
  asyncHandler(likeController.likePost)
);

/**
 * @route   DELETE /api/posts/:postId/like
 * @desc    Unlike a post
 * @access  Private
 */
router.delete(
  '/:postId/like',
  authenticate,
  ...validateObjectId('postId'),
  handleValidationErrors,
  asyncHandler(likeController.unlikePost)
);

/**
 * @route   POST /api/posts/:postId/comments
 * @desc    Create a comment on a post
 * @access  Private
 */
router.post(
  '/:postId/comments',
  authenticate,
  ...validateObjectId('postId'),
  validateCreateComment,
  handleValidationErrors,
  asyncHandler(commentController.createComment)
);

/**
 * @route   GET /api/posts/:postId/comments
 * @desc    Get paginated root comments for a post
 * @access  Public (Optional Auth)
 */
router.get(
  '/:postId/comments',
  authenticateOptional,
  ...validateObjectId('postId'),
  validatePagination,
  handleValidationErrors,
  asyncHandler(commentController.getPostComments)
);

module.exports = router;
