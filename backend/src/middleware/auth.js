const jwt = require('jsonwebtoken');
const { logger, securityLogger } = require('../utils/logger');

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Invalid token format.',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Log successful authentication
    securityLogger.loginAttempt(decoded.email, true, req.ip);

    next();
  } catch (error) {
    logger.error('Authentication failed:', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });

    // Log failed authentication
    securityLogger.loginAttempt('unknown', false, req.ip);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired. Please login again.',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token. Please login again.',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed.',
        statusCode: 401,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {Array} roles - Allowed roles
 * @returns {Function} - Middleware function
 */
const authorize = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Access denied. Authentication required.',
        statusCode: 401,
        timestamp: new Date().toISOString()
      }
    });
  }

  if (!roles.includes(req.user.role)) {
    logger.warn('Authorization failed:', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRoles: roles,
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Insufficient permissions.',
        statusCode: 403,
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};

/**
 * Resource ownership middleware
 * @param {string} resourceParam - Parameter name containing resource ID
 * @param {string} userField - User field to check against
 * @returns {Function} - Middleware function
 */
const requireOwnership = (resourceParam = 'id', userField = 'userId') => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Access denied. Authentication required.',
        statusCode: 401,
        timestamp: new Date().toISOString()
      }
    });
  }

  const resourceId = req.params[resourceParam];
  const userId = req.user.id;

  // Check if user is admin (bypass ownership check)
  if (req.user.role === 'admin') {
    return next();
  }

  // Check ownership (this would typically involve a database query)
  // For now, we'll assume the resource has a userId field
  if (req.resource && req.resource[userField] !== userId) {
    logger.warn('Ownership check failed:', {
      userId,
      resourceId,
      resourceOwner: req.resource[userField],
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. You do not own this resource.',
        statusCode: 403,
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};

/**
 * Document access middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const documentAccessMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Authentication required.',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    const documentId = req.params.documentId || req.params.id;
    const action = req.method.toLowerCase();

    // Log document access attempt
    securityLogger.documentAccess(req.user.id, documentId, action, req.ip);

    // Check document permissions (this would typically involve a database query)
    // For now, we'll allow access and log the attempt

    next();
  } catch (error) {
    logger.error('Document access middleware error:', {
      error: error.message,
      userId: req.user?.id,
      documentId: req.params.documentId || req.params.id,
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    return res.status(500).json({
      success: false,
      error: {
        message: 'Document access check failed.',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Signature access middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const signatureAccessMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. Authentication required.',
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      });
    }

    const documentId = req.params.documentId || req.params.id;
    const action = req.method.toLowerCase();

    // Log signature access attempt
    securityLogger.signatureEvent(req.user.id, documentId, action, req.ip);

    next();
  } catch (error) {
    logger.error('Signature access middleware error:', {
      error: error.message,
      userId: req.user?.id,
      documentId: req.params.documentId || req.params.id,
      ip: req.ip,
      url: req.url,
      method: req.method
    });

    return res.status(500).json({
      success: false,
      error: {
        message: 'Signature access check failed.',
        statusCode: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration
 * @returns {string} - JWT token
 */
const generateToken = (payload, expiresIn = '24h') => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

/**
 * Generate refresh token
 * @param {Object} payload - Token payload
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
});

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  authorize,
  requireOwnership,
  documentAccessMiddleware,
  signatureAccessMiddleware,
  generateToken,
  verifyToken,
  generateRefreshToken
};
