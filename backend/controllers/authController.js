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
const { validatePasswordStrength, validateAndSanitizeEmail, validateAndSanitizeEmailAsync } = require('../utils/validators');
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

    // Sanitize and validate email (format, Gmail rules, disposable check, DNS MX check)
    const emailValidation = await validateAndSanitizeEmailAsync(email);
    if (!emailValidation.valid) {
      logger.logAuthEvent('register_failed', null, false, {
        reason: 'invalid_email',
        email,
        username,
        details: emailValidation.message,
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
/**
 * Request Password Reset
 * POST /api/auth/forgot-password
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

    const sanitizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      // Don't reveal if email exists or not (security best practice against account enumeration)
      logger.logAuthEvent('forgot_password_failed', null, false, {
        reason: 'user_not_found',
        email: sanitizedEmail,
      });

      return sendSuccess(res, null, 'If an account exists with this email, password reset instructions have been sent.');
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

    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    logger.info(`Password reset link generated for ${user.email}: ${resetUrl}`);

    // In dev/test mode, return token and URL for immediate local testing without SMTP server
    const responseData = process.env.NODE_ENV !== 'production'
      ? { resetToken, resetUrl }
      : null;

    sendSuccess(res, responseData, 'If an account exists with this email, password reset instructions have been sent.');
  } catch (error) {
    logger.logError('Forgot password error', error);
    next(errors.internalServerError('Password reset request failed'));
  }
};

/**
 * Reset Password with Token
 * POST /api/auth/reset-password
 *
 * @param {Object} req - Express request object
 * @param {string} req.body.token - Password reset token
 * @param {string} req.body.newPassword - New password
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return next(errors.badRequest('Reset token is required', { field: 'token' }));
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return next(errors.badRequest('New password is required', { field: 'newPassword' }));
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return next(errors.badRequest(passwordValidation.message, { field: 'newPassword' }));
    }

    // Find user with active, unexpired token
    const user = await User.findOne({
      verificationToken: token.trim(),
      verificationExpiry: { $gt: new Date() },
    }).select('+verificationToken +verificationExpiry +password');

    if (!user) {
      logger.logAuthEvent('reset_password_failed', null, false, {
        reason: 'invalid_or_expired_token',
      });
      return next(errors.badRequest('Invalid or expired password reset token. Please request a new link.', { field: 'token' }));
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    logger.logAuthEvent('reset_password_success', user._id, true, {
      email: user.email,
    });

    sendSuccess(res, null, 'Password has been reset successfully. You can now log in with your new password.');
  } catch (error) {
    logger.logError('Reset password error', error);
    next(errors.internalServerError('Failed to reset password. Please try again.'));
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

/**
 * Google OAuth Sign-in & Sign-up
 * POST /api/auth/google
 *
 * Handles Google credential (ID Token) verification and either signs in
 * an existing user or creates a new user profile.
 */
const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      logger.logAuthEvent('google_auth_failed', null, false, {
        reason: 'missing_credential',
      });
      return next(errors.unauthorized('Google credential is required. Please sign in with your Google account.'));
    }

    let googleUser = null;

    // In unit test environment, allow mock Google tokens for isolated test execution
    if (process.env.NODE_ENV === 'test' && credential.startsWith('mock-google-token:')) {
      try {
        const rawPayload = Buffer.from(credential.replace('mock-google-token:', ''), 'base64').toString('utf-8');
        const mockPayload = JSON.parse(rawPayload);

        if (mockPayload.emailVerified === false) {
          logger.logAuthEvent('google_auth_failed', null, false, {
            reason: 'email_not_verified_by_google',
            email: mockPayload.email,
          });
          return next(errors.unauthorized('Your Google email address is not verified by Google. Please use a verified Google account.'));
        }

        googleUser = {
          googleId: mockPayload.googleId || mockPayload.sub,
          email: mockPayload.email,
          emailVerified: true,
          firstName: mockPayload.firstName || 'GoogleUser',
          lastName: mockPayload.lastName || 'Account',
          profilePicture: mockPayload.profilePicture || null,
        };
      } catch (e) {
        logger.warn('Failed to parse test mock google token', { error: e.message });
      }
    } else {
      // Real Google Identity Services ID Token verification with Google OAuth2 API
      try {
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (tokenRes.ok) {
          const tokenInfo = await tokenRes.json();

          // Enforce that Google confirms the email is verified
          const isVerified = tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true;
          if (!isVerified) {
            logger.logAuthEvent('google_auth_failed', null, false, {
              reason: 'email_not_verified_by_google',
              email: tokenInfo.email,
            });
            return next(errors.unauthorized('Your Google email address is not verified by Google. Please use a verified Google account.'));
          }

          googleUser = {
            googleId: tokenInfo.sub,
            email: tokenInfo.email,
            emailVerified: true,
            firstName: tokenInfo.given_name || (tokenInfo.name ? tokenInfo.name.split(' ')[0] : 'User'),
            lastName: tokenInfo.family_name || (tokenInfo.name ? tokenInfo.name.split(' ').slice(1).join(' ') : ''),
            profilePicture: tokenInfo.picture || null,
          };
        } else {
          const errText = await tokenRes.text();
          logger.warn('Google token verification failed', { error: errText });
        }
      } catch (fetchErr) {
        logger.warn('Error connecting to Google token verification endpoint', { error: fetchErr.message });
      }
    }

    if (!googleUser || !googleUser.email || !googleUser.googleId) {
      logger.logAuthEvent('google_auth_failed', null, false, {
        reason: 'invalid_or_unverified_google_credentials',
      });
      return next(errors.unauthorized('Invalid or unverified Google account. Please choose a real, verified Google account.'));
    }

    // Validate email format and reject anonymous / fake patterns
    const emailValidation = validateAndSanitizeEmail(googleUser.email);
    if (!emailValidation.valid) {
      logger.logAuthEvent('google_auth_failed', null, false, {
        reason: 'invalid_google_email_format',
        email: googleUser.email,
        details: emailValidation.message,
      });
      return next(errors.unauthorized(emailValidation.message));
    }

    const { googleId, email, firstName, lastName, profilePicture } = googleUser;
    const sanitizedEmail = email.toLowerCase().trim();

    // 3. Find existing user by googleId or email
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user previously registered with email
      user = await User.findOne({ email: sanitizedEmail });

      if (user) {
        // Link googleId to existing account
        user.googleId = googleId;
        user.isVerified = true;
        if (!user.profilePicture && profilePicture) {
          user.profilePicture = profilePicture;
        }
        await user.save();
        logger.logAuthEvent('google_account_linked', user._id, true, {
          email: sanitizedEmail,
        });
      }
    }

    // 4. If user does not exist, create new user
    if (!user) {
      // Generate a unique, clean username
      let baseUsername = sanitizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
      if (baseUsername.length < 3) baseUsername = `user_${baseUsername}`;
      if (baseUsername.length > 14) baseUsername = baseUsername.substring(0, 14);

      let generatedUsername = baseUsername;
      let counter = 1;
      while (await User.findOne({ username: generatedUsername })) {
        generatedUsername = `${baseUsername.substring(0, 10)}_${Math.floor(100 + Math.random() * 900)}`;
        counter++;
        if (counter > 10) {
          generatedUsername = `u_${Date.now().toString().slice(-6)}`;
          break;
        }
      }

      user = new User({
        email: sanitizedEmail,
        username: generatedUsername,
        firstName: firstName || 'User',
        lastName: (lastName && lastName.trim()) ? lastName.trim() : 'Account',
        profilePicture: profilePicture || null,
        googleId,
        authProvider: 'google',
        isVerified: true,
      });

      await user.save();
      logger.logAuthEvent('google_register_success', user._id, true, {
        email: sanitizedEmail,
        username: user.username,
      });
    } else {
      logger.logAuthEvent('google_login_success', user._id, true, {
        email: sanitizedEmail,
        username: user.username,
      });
    }

    // 5. Update last login timestamp and IP
    user.lastLogin = new Date();
    user.ipAddress = req.ip;
    await user.save();

    // 6. Generate access & refresh tokens
    const tokens = generateTokens(user._id.toString());

    // 7. Return success response
    sendSuccess(res, {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
      },
      tokens,
    }, 'Google authentication successful');
  } catch (error) {
    logger.logError('Google authentication error', error);
    next(errors.internalServerError('Google authentication failed. Please try again.'));
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  refreshAccessToken,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
