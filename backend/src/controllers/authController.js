const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/errorHandler');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { logger, securityLogger } = require('../utils/logger');
const { User, AuditTrail } = require('../services/databaseService');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      company,
      role = 'user'
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'All required fields must be provided',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid email format',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Password must be at least 8 characters long',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'User with this email already exists',
          statusCode: 409,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: true,
      emailVerified: false,
      profile: {
        company: company || null
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Generate email verification token
    const verificationToken = jwt.sign(
      {
        userId: user.id,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log user registration
    await AuditTrail.logSecurityEvent(user.id, 'register', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: user.email
    });

    // Log successful registration
    securityLogger.loginAttempt(email, true, req.ip);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        },
        token,
        verificationToken
      },
      message: 'User registered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('User registration failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Log failed login attempt
      securityLogger.loginAttempt(email, false, req.ip);

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user is active
    if (!user.is_active) {
      // Log failed login attempt
      securityLogger.loginAttempt(email, false, req.ip);

      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      // Log failed login attempt
      securityLogger.loginAttempt(email, false, req.ip);

      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is temporarily locked due to too many failed login attempts',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incrementLoginAttempts();

      // Log failed login attempt
      securityLogger.loginAttempt(email, false, req.ip);

      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    // Log successful login
    securityLogger.loginAttempt(email, true, req.ip);

    // Log user login
    await AuditTrail.logSecurityEvent(user.id, 'login', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: user.email
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin
        },
        token,
        refreshToken
      },
      message: 'Login successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('User login failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        token: newToken
      },
      message: 'Token refreshed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid refresh token',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    logger.error('Token refresh failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', asyncHandler(async (req, res) => {
  try {
    // Log user logout
    await AuditTrail.logSecurityEvent(req.user.id, 'logout', 'low', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.user.email
    });

    res.json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('User logout failed:', error);
    throw error;
  }
}));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get user profile failed:', error);
    throw error;
  }
}));

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', asyncHandler(async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    const {
      firstName,
      lastName,
      profile,
      preferences
    } = req.body;

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (profile) updateData.profile = { ...user.profile, ...profile };
    if (preferences) updateData.preferences = { ...user.preferences, ...preferences };

    await user.update(updateData);

    // Log profile update
    await AuditTrail.logSecurityEvent(user.id, 'profile_update', 'low', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      changes: updateData
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.is_active,
          emailVerified: user.emailVerified,
          lastLogin: user.lastLogin,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      },
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Update user profile failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Current password and new password are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'New password must be at least 8 characters long',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Update password
    await user.update({ password: hashedNewPassword });

    // Log password change
    await AuditTrail.logSecurityEvent(user.id, 'password_change', 'high', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Change password failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = await User.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date().toISOString()
      });
    }

    // Generate password reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token
    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    });

    // Log password reset request
    await AuditTrail.logSecurityEvent(user.id, 'password_reset_request', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: user.email
    });

    // TODO: Send email with reset link
    // For now, just log the token (in production, this should be sent via email)
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Forgot password failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Token and new password are required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'New password must be at least 8 characters long',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user by reset token
    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired reset token',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Update password and clear reset token
    await user.update({
      password: hashedNewPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    // Log password reset
    await AuditTrail.logSecurityEvent(user.id, 'password_reset', 'high', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Reset password failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'Password reset email sent',
        timestamp: new Date().toISOString()
      });
    }

    // Generate reset token (in real app, this would be sent via email)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Save reset token to user
    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour
    });

    // Log password reset request
    await AuditTrail.logSecurityEvent(user.id, 'password_reset_requested', 'medium', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password reset email sent',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Forgot password failed:', error);
    throw error;
  }
}));

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', authRateLimiter, asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Verification token is required',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid verification token',
          statusCode: 400,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Find user and update email verification status
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }

    await user.update({ emailVerified: true });

    // Log email verification
    await AuditTrail.logSecurityEvent(user.id, 'email_verified', 'low', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: user.email
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Email verification failed:', error);
    throw error;
  }
}));

module.exports = router;
