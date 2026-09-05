/**
 * Validation Helpers
 * Reusable validation functions
 */

const dns = require('dns').promises;
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
 * List of known disposable and anonymous email domains
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'fake.com',
  'fakemailgenerator.com',
  'getnada.com',
  'mohmal.com',
  'crazymailing.com',
  'burnermail.io',
  'temp-mail.org',
  'generator.email',
  'emailondeck.com',
  'mytemp.email',
  'inboxbear.com',
  'dropmail.me',
]);

/**
 * Validate Gmail specific address rules
 * - Google requires 6 to 30 characters
 * - Only a-z, 0-9, and periods (.)
 * - Cannot start/end with dot, no consecutive dots
 * - Reject anonymous/dummy usernames
 * @param {string} email - Full email address
 * @returns {Object} { valid: boolean, message?: string }
 */
const validateGmailAddress = (email) => {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return { valid: false, message: 'Invalid email address format' };
  }

  const [username, domain] = parts;
  const lowerDomain = domain.toLowerCase();

  if (lowerDomain === 'gmail.com' || lowerDomain === 'googlemail.com') {
    // Check length: Google strictly requires 6 to 30 characters
    if (username.length < 6 || username.length > 30) {
      return {
        valid: false,
        message: `Invalid Gmail address: Gmail usernames must be between 6 and 30 characters long ("${email}" cannot exist on Gmail).`,
      };
    }

    // Check characters: letters, numbers, and periods only
    if (!/^[a-z0-9.]+$/i.test(username)) {
      return {
        valid: false,
        message: 'Invalid Gmail address: only letters (a-z), numbers (0-9), and periods (.) are allowed.',
      };
    }

    // Cannot start or end with a period, and cannot contain consecutive periods
    if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
      return {
        valid: false,
        message: 'Invalid Gmail address: cannot begin or end with a dot or contain consecutive dots.',
      };
    }

    // Check for anonymous / dummy placeholders
    const cleanUsername = username.replace(/\./g, '').toLowerCase();
    const anonymousPatterns = [
      /^anonymous/i,
      /^nobody/i,
      /^dummy/i,
      /^fakemail/i,
      /^throwaway/i,
      /^acb$/i,
      /^abc$/i,
    ];
    for (const pattern of anonymousPatterns) {
      if (pattern.test(cleanUsername)) {
        return {
          valid: false,
          message: 'Anonymous and placeholder Gmail addresses are not accepted. Please use your genuine Google account.',
        };
      }
    }
  }

  return { valid: true };
};

/**
 * Check if an email uses a disposable / temporary email domain
 * @param {string} email
 * @returns {boolean}
 */
const isDisposableEmail = (email) => {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
};

/**
 * Verify whether an email domain actually exists and can receive emails via DNS MX lookup
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
const checkDomainExists = async (domain) => {
  const cleanDomain = domain.toLowerCase().trim();

  // Allow standard mock domains during unit tests
  if (
    process.env.NODE_ENV === 'test' &&
    (cleanDomain === 'example.com' || cleanDomain.endsWith('.example.com') || cleanDomain === 'localhost')
  ) {
    return true;
  }

  try {
    // Attempt to resolve MX records (mail exchange)
    const mxRecords = await Promise.race([
      dns.resolveMx(cleanDomain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 3000)),
    ]);

    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      return true;
    }
  } catch (err) {
    // If MX lookup failed, check A record as fallback (RFC 5321 fallback rule)
    try {
      const aRecords = await Promise.race([
        dns.resolve(cleanDomain, 'A'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 2000)),
      ]);
      if (Array.isArray(aRecords) && aRecords.length > 0) {
        return true;
      }
    } catch (aErr) {
      // Domain truly does not exist or has no DNS records
      return false;
    }
  }

  return false;
};

/**
 * Validate and sanitize email synchronously (format, Gmail rules, disposable check)
 * @param {string} email - Email to validate and sanitize
 * @returns {Object} Result with email and validity
 */
const validateAndSanitizeEmail = (email) => {
  const sanitized = sanitizeInput(email).toLowerCase();

  if (!isValidEmail(sanitized)) {
    return { valid: false, email: sanitized, message: 'Invalid email format' };
  }

  if (isDisposableEmail(sanitized)) {
    return {
      valid: false,
      email: sanitized,
      message: 'Disposable or temporary email addresses are not permitted. Please use a permanent email address.',
    };
  }

  const gmailCheck = validateGmailAddress(sanitized);
  if (!gmailCheck.valid) {
    return { valid: false, email: sanitized, message: gmailCheck.message };
  }

  return { valid: true, email: sanitized };
};

/**
 * Validate and sanitize email asynchronously (includes DNS MX domain existence check)
 * @param {string} email - Email to validate and sanitize
 * @returns {Promise<Object>} Result with email and validity
 */
const validateAndSanitizeEmailAsync = async (email) => {
  const syncResult = validateAndSanitizeEmail(email);
  if (!syncResult.valid) {
    return syncResult;
  }

  const domain = syncResult.email.split('@')[1];
  const domainExists = await checkDomainExists(domain);
  if (!domainExists) {
    return {
      valid: false,
      email: syncResult.email,
      message: `The email domain "${domain}" does not exist or cannot receive emails. Please provide an active, valid email address.`,
    };
  }

  return syncResult;
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
  validateGmailAddress,
  isDisposableEmail,
  checkDomainExists,
  validateAndSanitizeEmail,
  validateAndSanitizeEmailAsync,
};
