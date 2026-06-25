const likeService = require('../services/likeService');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

/**
 * Like a post
 * POST /api/posts/:postId/like
 */
const likePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { id: userId } = req.user;

    const result = await likeService.likePost(postId, userId);

    sendSuccess(res, result, 'Post liked successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Unlike a post
 * DELETE /api/posts/:postId/like
 */
const unlikePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { id: userId } = req.user;

    const result = await likeService.unlikePost(postId, userId);

    sendSuccess(res, result, 'Post unliked successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Like a comment
 * POST /api/comments/:commentId/like
 */
const likeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { id: userId } = req.user;

    const result = await likeService.likeComment(commentId, userId);

    sendSuccess(res, result, 'Comment liked successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Unlike a comment
 * DELETE /api/comments/:commentId/like
 */
const unlikeComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { id: userId } = req.user;

    const result = await likeService.unlikeComment(commentId, userId);

    sendSuccess(res, result, 'Comment unliked successfully', HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  likePost,
  unlikePost,
  likeComment,
  unlikeComment,
};
