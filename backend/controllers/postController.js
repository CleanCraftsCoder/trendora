const postService = require('../services/postService');
const userService = require('../services/userService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { HTTP_STATUS } = require('../config/constants');
const upload = require('../middlewares/upload');

/**
 * Handle post creation
 * POST /api/posts
 */
const createPost = async (req, res, next) => {
  try {
    const { id: authorId } = req.user;
    const { caption, visibility } = req.body;

    if (!req.files || req.files.length === 0) {
      return next(errors.badRequest('At least one image file must be uploaded'));
    }

    // Extract paths from uploaded files
    const images = req.files.map((file) => upload.getFileUrl(file));

    const post = await postService.createPost(authorId, {
      caption,
      visibility,
      images,
    });

    sendSuccess(res, post, 'Post created successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a single post's details
 * GET /api/posts/:postId
 */
const getPostDetails = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const currentUserId = req.user?.id;

    const post = await postService.getPostById(postId, currentUserId);

    sendSuccess(res, post, 'Post details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing post
 * PUT /api/posts/:postId
 */
const updatePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { id: authorId } = req.user;
    const { caption, visibility } = req.body;

    const post = await postService.updatePost(postId, authorId, {
      caption,
      visibility,
    });

    sendSuccess(res, post, 'Post updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a post (soft delete)
 * DELETE /api/posts/:postId
 */
const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { id: authorId } = req.user;

    await postService.deletePost(postId, authorId);

    sendSuccess(res, null, 'Post deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get scrollable list of posts (feed/explore/profile)
 * GET /api/posts
 */
const getPosts = async (req, res, next) => {
  try {
    const { username, hashtag } = req.query;
    const currentUserId = req.user?.id;
    const page = parseInt(req.query.page || 1);
    const limit = Math.min(parseInt(req.query.limit || 20), 50);

    let queryAuthorId = req.query.authorId;

    // Resolve username to author ID if username query is provided
    if (username && !queryAuthorId) {
      try {
        const user = await userService.getUserByIdentifier(username);
        queryAuthorId = user._id.toString();
      } catch (err) {
        // If user not found, return empty paginated response
        return sendPaginated(res, [], page, limit, 0);
      }
    }

    const result = await postService.getPosts({
      authorId: queryAuthorId,
      hashtag,
      currentUserId,
      page,
      limit,
    });

    sendPaginated(
      res,
      result.data,
      result.pagination.page,
      result.pagination.limit,
      result.pagination.total
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  getPostDetails,
  updatePost,
  deletePost,
  getPosts,
};
