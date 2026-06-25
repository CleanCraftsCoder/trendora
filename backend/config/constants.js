/**
 * Application Constants
 * Define all application-wide constants
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
};

// Success Messages
const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  COMMENT_CREATED: 'Comment created successfully',
  LIKE_SUCCESS: 'Post liked successfully',
  UNLIKE_SUCCESS: 'Post unliked successfully',
  FOLLOW_SUCCESS: 'User followed successfully',
  UNFOLLOW_SUCCESS: 'User unfollowed successfully',
};

// User Constants
const USER = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 8,
  BIO_MAX_LENGTH: 500,
  FIRST_NAME_MAX_LENGTH: 50,
  LAST_NAME_MAX_LENGTH: 50,
};

// Post Constants
const POST = {
  CAPTION_MAX_LENGTH: 2000,
  CAPTION_MIN_LENGTH: 1,
  MAX_IMAGES: 10,
  MIN_IMAGES: 1,
  HASHTAG_MIN_LENGTH: 1,
  HASHTAG_MAX_LENGTH: 50,
};

// Comment Constants
const COMMENT = {
  TEXT_MAX_LENGTH: 1000,
  TEXT_MIN_LENGTH: 1,
  MAX_NESTING_LEVEL: 2, // Root comment + 1 level of replies
};

// Pagination Constants
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 50,
  MIN_PAGE_SIZE: 1,
};

// File Upload Constants
const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5242880, // 5MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  UPLOAD_DIR: './uploads',
  POSTS_DIR: 'posts',
  PROFILES_DIR: 'profiles',
  TEMP_DIR: 'temp',
};

// Post Visibility Options
const POST_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  FRIENDS: 'friends',
};

// Notification Types
const NOTIFICATION_TYPE = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MENTION: 'mention',
  SHARE: 'share',
};

// Follow Status
const FOLLOW_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  BLOCKED: 'blocked',
};

// Like Types
const LIKE_TYPE = {
  POST: 'post',
  COMMENT: 'comment',
};

// Cache Keys
const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:${userId}`,
  USER_FOLLOWERS_COUNT: (userId) => `user:${userId}:followers:count`,
  USER_FOLLOWING_COUNT: (userId) => `user:${userId}:following:count`,
  USER_POSTS_COUNT: (userId) => `user:${userId}:posts:count`,
  FEED: (userId, page) => `feed:${userId}:page:${page}`,
  POST: (postId) => `post:${postId}`,
  TRENDING: (timeRange) => `trending:${timeRange}`,
  NOTIFICATIONS: (userId, page) => `notifications:${userId}:page:${page}`,
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  USER_PROFILE: 3600, // 1 hour
  FEED: 1800, // 30 minutes
  TRENDING: 900, // 15 minutes
  POST: 3600, // 1 hour
  SHORT: 300, // 5 minutes
  LONG: 86400, // 24 hours
};

// JWT
const JWT = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  TOKEN_TYPE: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },
};

// Email Templates
const EMAIL_TEMPLATES = {
  VERIFICATION: 'verification',
  RESET_PASSWORD: 'reset_password',
  WELCOME: 'welcome',
};

// Environment-specific
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

// Rate Limiting
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // requests per window
  },
  AUTH: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // requests per window
  },
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // requests per window
  },
};

// Log Levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Regular Expressions
const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  URL: /^https?:\/\/.+/,
  PHONE: /^[0-9]{10,15}$/,
  HASHTAG: /^#[a-zA-Z0-9_]+$/,
};

// Default Values
const DEFAULTS = {
  PROFILE_PICTURE: 'https://via.placeholder.com/200',
  COVER_IMAGE: 'https://via.placeholder.com/1200x300',
};

module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  USER,
  POST,
  COMMENT,
  PAGINATION,
  FILE_UPLOAD,
  POST_VISIBILITY,
  NOTIFICATION_TYPE,
  FOLLOW_STATUS,
  LIKE_TYPE,
  CACHE_KEYS,
  CACHE_TTL,
  JWT,
  EMAIL_TEMPLATES,
  ENVIRONMENTS,
  RATE_LIMITS,
  LOG_LEVELS,
  REGEX,
  DEFAULTS,
};
