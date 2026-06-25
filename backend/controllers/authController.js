/**
 * Authentication Controller
 * Handles user registration, login, and token management
 */

const User = require('../models/User');
const {
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
} = require('../middlewares/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { errors } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { validatePasswordStrength, validateAndSanitizeEmail } = require('../utils/validators');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Register a new user
 * POST /api/auth/register
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.email - User email
 * @param {string} req.body.username - User username
 * @param {string} req.body.password - User password
 * @param {string} req.body.firstName - User first name
 * @param {string} req.body.lastName - User last name
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const register = async (req, res, next) => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      logger.logAuthEvent('register_failed', null, false, {
        reason: 'weak_password',
        email,
        username,
      });

      return next(
        errors.badRequest(passwordValidation.message, {
          field: 'password',
        })
      );
    }

    // Sanitize and validate email
    const emailValidation = validateAndSanitizeEmail(email);
    if (!emailValidation.valid) {
      logger.logAuthEvent('register_failed', null, false, {
        reason: 'invalid_email',
        email,
        username,
      });

      return next(
        errors.badRequest(emailValidation.message, {
          field: 'email',
        })
      );
    }

    const sanitizedEmail = emailValidation.email;

    // Check if user already exists (email)
    let existingUser = await User.findOne({ email: sanitizedEmail });

    if (existingUser) {
      logger.logAuthEvent('register_failed', null, false, {
        reason: 'email_already_exists',
        email: sanitizedEmail,
        username,
      });

      return next(
        errors.conflict('Email already registered', {
          field: 'email',
        })
      );
    }

    // Check if username is taken
    existingUser = await User.findOne({ username: username.toLowerCase() });

    if (existingUser) {
      logger.logAuthEvent('register_failed', null, false, {
        reason: 'username_already_exists',
        email: sanitizedEmail,
        username,
      });

      return next(
        errors.conflict('Username already taken', {
          field: 'username',
        })
      );
    }

    // Create new user
    const newUser = new User({
      email: sanitizedEmail,
      username: username.toLowerCase(),
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      isVerified: false, // Will implement email verification in future phase
    });

    // Save user to database
    await newUser.save();

    logger.logAuthEvent('register_success', newUser._id, true, {
      email: sanitizedEmail,
      username: newUser.username,
    });

    // Generate tokens
    const tokens = generateTokens(newUser._id.toString());

    // Return success response
    sendSuccess(
      res,
      {
        user: {
          id: newUser._id,
          email: newUser.email,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
        tokens,
      },
      'User registered successfully',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    logger.logError('Registration error', error);
    next(errors.internalServerError('Registration failed'));
  }
};

/**
 * Login user
 * POST /api/auth/login
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      logger.logAuthEvent('login_failed', null, false, {
        reason: 'missing_credentials',
        email,
      });

      return next(errors.badRequest('Email and password are required'));
    }

    // Find user with password field
    const user = await User.findByEmailWithPassword(email.toLowerCase());

    // Check if user exists
    if (!user) {
      logger.logAuthEvent('login_failed', null, false, {
        reason: 'user_not_found',
        email,
      });

      return next(
        errors.unauthorized('Invalid email or password', {
          field: 'email',
        })
      );
    }

    // Compare passwords
    const passwordMatch = await user.comparePassword(password);

    if (!passwordMatch) {
      logger.logAuthEvent('login_failed', user._id, false, {
        reason: 'incorrect_password',
        email: user.email,
      });

      return next(
        errors.unauthorized('Invalid email or password', {
          field: 'password',
        })
      );
    }

    logger.logAuthEvent('login_success', user._id, true, {
      email: user.email,
      username: user.username,
    });

    // Update last login
    user.lastLogin = new Date();
    user.ipAddress = req.ip;
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString());

    // Return success response
    sendSuccess(res, {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      },
      tokens,
    });
  } catch (error) {
    logger.logError('Login error', error);
    next(errors.internalServerError('Login failed'));
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 *
 * Uses the authenticateRefreshToken middleware to verify refresh token
 * then generates new access token
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.refreshToken - Refresh token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { user } = req;

    // Generate new access token
    const accessToken = generateAccessToken(user.id.toString());

    logger.logAuthEvent('token_refresh_success', user.id, true, {
      email: user.email,
      username: user.username,
    });

    // Return success response
    sendSuccess(res, {
      accessToken,
      expiresIn: '15m',
    });
  } catch (error) {
    logger.logError('Token refresh error', error);
    next(errors.internalServerError('Token refresh failed'));
  }
};

/**
 * Logout user (invalidate refresh token on client)
 * POST /api/auth/logout
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const logout = async (req, res, next) => {
  try {
    const { user } = req;

    logger.logAuthEvent('logout_success', user.id, true, {
      email: user.email,
      username: user.username,
    });

    // In real implementation, could invalidate token on server (e.g., Redis blacklist)
    // For now, token expiration is handled on client side

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    logger.logError('Logout error', error);
    next(errors.internalServerError('Logout failed'));
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const { user } = req;

    // Fetch full user data
    const fullUser = await User.findById(user.id);

    if (!fullUser) {
      return next(errors.notFound('User not found'));
    }

    sendSuccess(res, {
      id: fullUser._id,
      email: fullUser.email,
      username: fullUser.username,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      bio: fullUser.bio,
      profilePicture: fullUser.profilePicture,
      coverImage: fullUser.coverImage,
      isVerified: fullUser.isVerified,
      isPublic: fullUser.isPublic,
      followersCount: fullUser.followersCount,
      followingCount: fullUser.followingCount,
      postsCount: fullUser.postsCount,
      createdAt: fullUser.createdAt,
    });
  } catch (error) {
    logger.logError('Get current user error', error);
    next(errors.internalServerError('Failed to fetch user'));
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 *
 * Note: Email sending will be implemented in later phase
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.email - User email
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(errors.badRequest('Email is required'));
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      logger.logAuthEvent('forgot_password_failed', null, false, {
        reason: 'user_not_found',
        email,
      });

      return sendSuccess(res, null, 'If email exists, reset link will be sent');
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    user.verificationToken = resetToken;
    user.verificationExpiry = resetExpiry;
    await user.save();

    logger.logAuthEvent('forgot_password_requested', user._id, true, {
      email: user.email,
    });

    // TODO: Send email with reset link
    // Email sending will be implemented in Phase 4

    sendSuccess(res, null, 'If email exists, reset link will be sent');
  } catch (error) {
    logger.logError('Forgot password error', error);
    next(errors.internalServerError('Password reset request failed'));
  }
};

/**
 * Verify email address
 * POST /api/auth/verify-email
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.token - Verification token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(errors.badRequest('Verification token is required'));
    }

    // Find user with token
    const user = await User.findOne({
      verificationToken: token,
      verificationExpiry: { $gt: new Date() },
    }).select('+verificationToken +verificationExpiry');

    if (!user) {
      logger.logAuthEvent('email_verification_failed', null, false, {
        reason: 'invalid_or_expired_token',
      });

      return next(
        errors.badRequest('Invalid or expired verification token', {
          field: 'token',
        })
      );
    }

    // Mark email as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    logger.logAuthEvent('email_verification_success', user._id, true, {
      email: user.email,
    });

    sendSuccess(res, null, 'Email verified successfully');
  } catch (error) {
    logger.logError('Email verification error', error);
    next(errors.internalServerError('Email verification failed'));
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  forgotPassword,
  verifyEmail,
};
