/**
 * Input Validation Middleware
 * Validates incoming request data
 */

const { body, validationResult, param, query } = require('express-validator');
const { sendValidationError } = require('../utils/response');
const { REGEX, USER, POST, COMMENT } = require('../config/constants');

/**
 * Middleware to handle validation errors
 * Should be used after validation rules
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return sendValidationError(res, errors.array());
  }

  next();
};

/**
 * Auth validation rules
 */
const validateRegister = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('username')
    .trim()
    .isLength({ min: USER.USERNAME_MIN_LENGTH, max: USER.USERNAME_MAX_LENGTH })
    .withMessage(`Username must be ${USER.USERNAME_MIN_LENGTH}-${USER.USERNAME_MAX_LENGTH} characters`)
    .matches(REGEX.USERNAME)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),

  body('password')
    .isLength({ min: USER.PASSWORD_MIN_LENGTH })
    .withMessage(`Password must be at least ${USER.PASSWORD_MIN_LENGTH} characters`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain special character'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: USER.FIRST_NAME_MAX_LENGTH })
    .withMessage(`First name must not exceed ${USER.FIRST_NAME_MAX_LENGTH} characters`),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: USER.LAST_NAME_MAX_LENGTH })
    .withMessage(`Last name must not exceed ${USER.LAST_NAME_MAX_LENGTH} characters`),
];

const validateLogin = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

/**
 * Post validation rules
 */
const validateCreatePost = [
  body('caption')
    .trim()
    .isLength({ max: POST.CAPTION_MAX_LENGTH })
    .withMessage(`Caption must not exceed ${POST.CAPTION_MAX_LENGTH} characters`),

  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array')
    .custom((value) => {
      if (!Array.isArray(value)) return true;
      if (value.length > 30) {
        throw new Error('Maximum 30 hashtags allowed');
      }
      return true;
    }),

  body('visibility')
    .optional()
    .isIn(['public', 'private', 'friends'])
    .withMessage('Invalid visibility value'),
];

const validateUpdatePost = [
  body('caption')
    .optional()
    .trim()
    .isLength({ max: POST.CAPTION_MAX_LENGTH })
    .withMessage(`Caption must not exceed ${POST.CAPTION_MAX_LENGTH} characters`),

  body('visibility')
    .optional()
    .isIn(['public', 'private', 'friends'])
    .withMessage('Invalid visibility value'),
];

/**
 * Comment validation rules
 */
const validateCreateComment = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: COMMENT.TEXT_MIN_LENGTH, max: COMMENT.TEXT_MAX_LENGTH })
    .withMessage(
      `Comment must be ${COMMENT.TEXT_MIN_LENGTH}-${COMMENT.TEXT_MAX_LENGTH} characters`
    ),

  body('parentComment')
    .optional()
    .custom((value) => {
      if (value === '') return true; // Allow empty string
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid comment ID');
      }
      return true;
    }),
];

const validateUpdateComment = [
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Comment text is required')
    .isLength({ min: COMMENT.TEXT_MIN_LENGTH, max: COMMENT.TEXT_MAX_LENGTH })
    .withMessage(
      `Comment must be ${COMMENT.TEXT_MIN_LENGTH}-${COMMENT.TEXT_MAX_LENGTH} characters`
    ),
];

/**
 * User validation rules
 */
const validateUpdateUser = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ max: USER.FIRST_NAME_MAX_LENGTH })
    .withMessage(`First name must not exceed ${USER.FIRST_NAME_MAX_LENGTH} characters`),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: USER.LAST_NAME_MAX_LENGTH })
    .withMessage(`Last name must not exceed ${USER.LAST_NAME_MAX_LENGTH} characters`),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: USER.BIO_MAX_LENGTH })
    .withMessage(`Bio must not exceed ${USER.BIO_MAX_LENGTH} characters`),
];

/**
 * ID validation (for URL parameters)
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid ID format');
      }
      return true;
    }),
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('cursor')
    .optional()
    .isString()
    .withMessage('Cursor must be a string'),
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateUpdateComment,
  validateUpdateUser,
  validateObjectId,
  validatePagination,
};
