/**
 * Validation Helpers
 * Reusable validation functions
 */

const { REGEX, USER, POST, COMMENT } = require('../config/constants');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return REGEX.EMAIL.test(email.trim());
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} Whether username is valid
 */
const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return REGEX.USERNAME.test(username.trim());
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * @param {string} password - Password to validate
 * @returns {boolean} Whether password is strong
 */
const isValidPassword = (password) => {
  if (!password || typeof password !== 'string' || password.length < USER.PASSWORD_MIN_LENGTH) {
    return false;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

/**
 * Validate username length
 * @param {string} username - Username to validate
 * @returns {Object} Validation result with message
 */
const validateUsernameLength = (username) => {
  if (!username) {
    return { valid: false, message: 'Username is required' };
  }

  if (username.length < USER.USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      message: `Username must be at least ${USER.USERNAME_MIN_LENGTH} characters`,
    };
  }

  if (username.length > USER.USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Username must not exceed ${USER.USERNAME_MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate password length
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with message
 */
const validatePasswordLength = (password) => {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < USER.PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${USER.PASSWORD_MIN_LENGTH} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate password strength with message
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with message
 */
const validatePasswordStrength = (password) => {
  const lengthValid = validatePasswordLength(password);
  if (!lengthValid.valid) {
    return lengthValid;
  }

  if (!isValidPassword(password)) {
    return {
      valid: false,
      message:
        'Password must contain uppercase, lowercase, number, and special character',
    };
  }

  return { valid: true };
};

/**
 * Validate bio length
 * @param {string} bio - Bio text to validate
 * @returns {Object} Validation result with message
 */
const validateBioLength = (bio) => {
  if (bio && bio.length > USER.BIO_MAX_LENGTH) {
    return {
      valid: false,
      message: `Bio must not exceed ${USER.BIO_MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate name format
 * @param {string} name - Name to validate
 * @returns {Object} Validation result with message
 */
const validateName = (name, maxLength = 50) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { valid: false, message: 'Name cannot be empty' };
  }

  if (trimmedName.length > maxLength) {
    return {
      valid: false,
      message: `Name must not exceed ${maxLength} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate caption length
 * @param {string} caption - Caption text to validate
 * @returns {Object} Validation result with message
 */
const validateCaptionLength = (caption) => {
  if (caption && caption.length > POST.CAPTION_MAX_LENGTH) {
    return {
      valid: false,
      message: `Caption must not exceed ${POST.CAPTION_MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate comment text length
 * @param {string} text - Comment text to validate
 * @returns {Object} Validation result with message
 */
const validateCommentLength = (text) => {
  if (!text) {
    return { valid: false, message: 'Comment text is required' };
  }

  if (text.length < COMMENT.TEXT_MIN_LENGTH) {
    return {
      valid: false,
      message: `Comment must be at least ${COMMENT.TEXT_MIN_LENGTH} character`,
    };
  }

  if (text.length > COMMENT.TEXT_MAX_LENGTH) {
    return {
      valid: false,
      message: `Comment must not exceed ${COMMENT.TEXT_MAX_LENGTH} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
const isValidURL = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return REGEX.URL.test(url);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone is valid
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return REGEX.PHONE.test(phone.replace(/\D/g, ''));
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} Whether ID is valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate page number
 * @param {number} page - Page number to validate
 * @param {number} min - Minimum page number
 * @returns {Object} Validation result with message
 */
const validatePageNumber = (page, min = 1) => {
  const pageNum = parseInt(page, 10);

  if (Number.isNaN(pageNum) || pageNum < min) {
    return { valid: false, message: `Page must be at least ${min}` };
  }

  return { valid: true, value: pageNum };
};

/**
 * Validate limit (items per page)
 * @param {number} limit - Limit to validate
 * @param {number} min - Minimum limit
 * @param {number} max - Maximum limit
 * @returns {Object} Validation result with message
 */
const validateLimit = (limit, min = 1, max = 50) => {
  const limitNum = parseInt(limit, 10);

  if (Number.isNaN(limitNum) || limitNum < min) {
    return { valid: false, message: `Limit must be at least ${min}` };
  }

  if (limitNum > max) {
    return { valid: false, message: `Limit must not exceed ${max}` };
  }

  return { valid: true, value: limitNum };
};

/**
 * Sanitize user input (remove dangerous characters)
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[`]/g, ''); // Remove backticks
};

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate and sanitize
 * @returns {Object} Result with email and validity
 */
const validateAndSanitizeEmail = (email) => {
  const sanitized = sanitizeInput(email).toLowerCase();

  if (!isValidEmail(sanitized)) {
    return { valid: false, email: sanitized, message: 'Invalid email format' };
  }

  return { valid: true, email: sanitized };
};

module.exports = {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  validateUsernameLength,
  validatePasswordLength,
  validatePasswordStrength,
  validateBioLength,
  validateName,
  validateCaptionLength,
  validateCommentLength,
  isValidURL,
  isValidPhone,
  isValidObjectId,
  validatePageNumber,
  validateLimit,
  sanitizeInput,
  validateAndSanitizeEmail,
};
