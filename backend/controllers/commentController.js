const commentService = require('../services/commentService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Create a new comment on a post
 * POST /api/posts/:postId/comments
 */
const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { id: authorId } = req.user;
    const { text } = req.body;

    const comment = await commentService.createComment(postId, authorId, { text });

    sendSuccess(res, comment, 'Comment created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated list of root comments for a post
 * GET /api/posts/:postId/comments
 */
const getPostComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page || 1);
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await commentService.getPostComments({
      postId,
      page,
      limit,
      currentUserId,
    });

    sendPaginated(res, result.data, result.pagination.page, result.pagination.limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a reply to an existing comment
 * POST /api/comments/:commentId/replies
 */
const createReply = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { id: authorId } = req.user;
    const { text, postId } = req.body;

    const reply = await commentService.createComment(postId, authorId, {
      text,
      parentComment: commentId,
    });

    sendSuccess(res, reply, 'Reply created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated list of replies to a comment
 * GET /api/comments/:commentId/replies
 */
const getCommentReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page || 1);
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    const result = await commentService.getCommentReplies({
      commentId,
      page,
      limit,
      currentUserId,
    });

    sendPaginated(res, result.data, result.pagination.page, result.pagination.limit, result.pagination.total);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing comment or reply
 * PUT /api/comments/:commentId
 */
const updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { id: authorId } = req.user;
    const { text } = req.body;

    const comment = await commentService.updateComment(commentId, authorId, text);

    sendSuccess(res, comment, 'Comment updated successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a comment or reply
 * DELETE /api/comments/:commentId
 */
const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { id: authorId } = req.user;

    await commentService.deleteComment(commentId, authorId);

    sendSuccess(res, null, 'Comment deleted successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getPostComments,
  createReply,
  getCommentReplies,
  updateComment,
  deleteComment,
};
