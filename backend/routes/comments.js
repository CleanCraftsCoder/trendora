/**
 * Comment Routes
 * Handles comment updating, deletion, replies, and liking
 */

const express = require('express');
const { authenticate, authenticateOptional } = require('../middlewares/auth');
const commentController = require('../controllers/commentController');
const likeController = require('../controllers/likeController');
const { 
  validateObjectId, 
  validateCreateComment, 
  validateUpdateComment, 
  validatePagination, 
  handleValidationErrors 
} = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Update a comment or reply
 * @access  Private
 */
router.put(
  '/:commentId',
  authenticate,
  ...validateObjectId('commentId'),
  validateUpdateComment,
  handleValidationErrors,
  asyncHandler(commentController.updateComment)
);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Soft delete a comment and its replies
 * @access  Private
 */
router.delete(
  '/:commentId',
  authenticate,
  ...validateObjectId('commentId'),
  handleValidationErrors,
  asyncHandler(commentController.deleteComment)
);

/**
 * @route   POST /api/comments/:commentId/replies
 * @desc    Create a reply to a comment
 * @access  Private
 */
router.post(
  '/:commentId/replies',
  authenticate,
  ...validateObjectId('commentId'),
  validateCreateComment,
  handleValidationErrors,
  asyncHandler(commentController.createReply)
);

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Get paginated replies to a comment
 * @access  Public (Optional Auth)
 */
router.get(
  '/:commentId/replies',
  authenticateOptional,
  ...validateObjectId('commentId'),
  validatePagination,
  handleValidationErrors,
  asyncHandler(commentController.getCommentReplies)
);

/**
 * @route   POST /api/comments/:commentId/like
 * @desc    Like a comment
 * @access  Private
 */
router.post(
  '/:commentId/like',
  authenticate,
  ...validateObjectId('commentId'),
  handleValidationErrors,
  asyncHandler(likeController.likeComment)
);

/**
 * @route   DELETE /api/comments/:commentId/like
 * @desc    Unlike a comment
 * @access  Private
 */
router.delete(
  '/:commentId/like',
  authenticate,
  ...validateObjectId('commentId'),
  handleValidationErrors,
  asyncHandler(likeController.unlikeComment)
);

module.exports = router;
