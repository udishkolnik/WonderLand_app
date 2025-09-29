const { logger } = require('../utils/logger');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 413 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, statusCode: 400 };
  }

  // Encryption errors
  if (err.message.includes('encryption') || err.message.includes('decryption')) {
    const message = 'Encryption/decryption failed';
    error = { message, statusCode: 500 };
  }

  // Signature errors
  if (err.message.includes('signature')) {
    const message = 'Signature operation failed';
    error = { message, statusCode: 500 };
  }

  // Database errors
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map((e) => e.message).join(', ');
    error = { message, statusCode: 400 };
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate entry';
    error = { message, statusCode: 409 };
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Foreign key constraint violation';
    error = { message, statusCode: 400 };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    const message = 'Too many requests';
    error = { message, statusCode: 429 };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * Handle 404 errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Handle async errors
 * @param {Function} fn - Async function
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle validation errors
 * @param {Object} errors - Validation errors
 * @returns {Object} - Formatted error response
 */
const handleValidationErrors = (errors) => {
  const formattedErrors = {};

  if (Array.isArray(errors)) {
    errors.forEach((error) => {
      if (error.path) {
        formattedErrors[error.path] = error.message;
      }
    });
  } else if (typeof errors === 'object') {
    Object.keys(errors).forEach((key) => {
      formattedErrors[key] = errors[key].message || errors[key];
    });
  }

  return {
    success: false,
    error: {
      message: 'Validation failed',
      statusCode: 400,
      details: formattedErrors,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Handle business logic errors
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} - Formatted error response
 */
const handleBusinessError = (message, statusCode = 400, details = {}) => ({
  success: false,
  error: {
    message,
    statusCode,
    details,
    timestamp: new Date().toISOString()
  }
});

/**
 * Handle security errors
 * @param {string} message - Error message
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleSecurityError = (message, req, res) => {
  logger.error('Security error:', {
    message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous'
  });

  res.status(403).json({
    success: false,
    error: {
      message: 'Access denied',
      statusCode: 403,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  handleValidationErrors,
  handleBusinessError,
  handleSecurityError
};
