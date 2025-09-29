const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * General rate limiter
 */
const rateLimiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many sensitive requests from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Strict rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many sensitive requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Auth rate limiter for login attempts
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many login attempts from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      email: req.body?.email || 'unknown'
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many login attempts from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Document upload rate limiter
 */
const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    success: false,
    error: {
      message: 'Too many file uploads from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many file uploads from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * API rate limiter for general API calls
 */
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 API calls per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many API requests from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('API rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many API requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Signature rate limiter for document signing
 */
const signatureRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 signatures per hour
  message: {
    success: false,
    error: {
      message: 'Too many signature requests from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Signature rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many signature requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limiter options
 * @returns {Function} - Rate limiter middleware
 */
const createCustomRateLimiter = (options) => rateLimit({
  windowMs: options.windowMs || 15 * 60 * 1000,
  max: options.max || 100,
  message: {
    success: false,
    error: {
      message: options.message || 'Too many requests from this IP, please try again later',
      statusCode: 429,
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Custom rate limit exceeded:', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      limitType: options.name || 'custom'
    });

    res.status(429).json({
      success: false,
      error: {
        message: options.message || 'Too many requests from this IP, please try again later',
        statusCode: 429,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = {
  rateLimiter,
  strictRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  apiRateLimiter,
  signatureRateLimiter,
  createCustomRateLimiter
};
