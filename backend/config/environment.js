/**
 * Environment Configuration
 * Loads and validates environment variables
 */

const path = require('path');

// Load environment variables
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

/**
 * Environment Variables Configuration
 * Centralized configuration from .env file
 */
const config = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  APP_NAME: process.env.APP_NAME || 'Trendora',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',

  // Database Configuration
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://localhost:27017/trendora',
  MONGODB_TEST_URI:
    process.env.MONGODB_TEST_URI ||
    'mongodb://localhost:27017/trendora_test',
  DB_NAME: process.env.DB_NAME || 'trendora',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_min_32_chars',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key_min_32_chars',

  // Redis Configuration
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB, 10) || 0,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // File Upload Configuration
  MULTER_UPLOAD_PATH: process.env.MULTER_UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880, // 5MB
  ALLOWED_FILE_TYPES:
    process.env.ALLOWED_FILE_TYPES ||
    'image/jpeg,image/png,image/webp,image/gif',

  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'trendora-uploads',
  AWS_S3_REGION: process.env.AWS_S3_REGION || 'us-east-1',
  AWS_CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL || '',

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',


  // Email Configuration
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Trendora',

  // CORS Configuration
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    'http://localhost:3000,http://localhost:3001',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  AUTH_RATE_LIMIT_MAX:
    parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  LOG_DIR: process.env.LOG_DIR || './logs',
  LOG_FILE: process.env.LOG_FILE || 'app.log',
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',
  LOG_MAX_DAYS: parseInt(process.env.LOG_MAX_DAYS, 10) || 14,

  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',

  // Socket.io Configuration
  SOCKET_CORS_ORIGIN:
    process.env.SOCKET_CORS_ORIGIN ||
    'http://localhost:3000',
  SOCKET_PING_INTERVAL:
    parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 25000,
  SOCKET_PING_TIMEOUT:
    parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 60000,

  // Pagination Defaults
  DEFAULT_PAGE_SIZE: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
  MAX_PAGE_SIZE: parseInt(process.env.MAX_PAGE_SIZE, 10) || 50,

  // Security
  HTTPS_REDIRECT: process.env.HTTPS_REDIRECT === 'true',
  SESSION_SECRET: process.env.SESSION_SECRET || 'your_session_secret',
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,

  // Development/Debug
  DEBUG: process.env.DEBUG === 'true',
  MOCK_EXTERNAL_SERVICES: process.env.MOCK_EXTERNAL_SERVICES === 'true',
  PRINT_QUERIES: process.env.PRINT_QUERIES === 'true',
};

/**
 * Validate required environment variables
 */
const validateConfig = () => {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

// Validate on import
if (config.NODE_ENV === 'production') {
  validateConfig();
}

/**
 * Check if running in specific environment
 */
config.isDevelopment = () => config.NODE_ENV === 'development';
config.isProduction = () => config.NODE_ENV === 'production';
config.isTest = () => config.NODE_ENV === 'test';

module.exports = config;
