const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');
const SecurityManager = require('../database/security');

/**
 * Military-Grade Security Middleware
 * Comprehensive security measures for production deployment
 */

class SecurityMiddleware {
  constructor() {
    this.securityManager = new SecurityManager();
    this.setupHelmet();
    this.setupRateLimiting();
    this.setupCORS();
    this.setupSecurityHeaders();
  }

  /**
   * Setup Helmet security headers
   */
  setupHelmet() {
    this.helmetConfig = helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
          scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\''],
          imgSrc: ['\'self\'', 'data:', 'https:'],
          connectSrc: ['\'self\''],
          fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
          objectSrc: ['\'none\''],
          mediaSrc: ['\'self\''],
          frameSrc: ['\'none\''],
          baseUri: ['\'self\''],
          formAction: ['\'self\''],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      dnsPrefetchControl: true,
      ieNoOpen: true,
      hidePoweredBy: true
    });
  }

  /**
   * Setup rate limiting
   */
  setupRateLimiting() {
    // General API rate limiting
    this.generalRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: 'Too many requests from this IP, please try again later.',
          retryAfter: '15 minutes'
        });
      }
    });

    // Authentication rate limiting
    this.authRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: 'Too many authentication attempts, please try again later.',
          retryAfter: '15 minutes'
        });
      }
    });

    // File upload rate limiting
    this.uploadRateLimit = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Limit each IP to 10 uploads per hour
      message: {
        error: 'Too many file uploads, please try again later.',
        retryAfter: '1 hour'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
          error: 'Too many file uploads, please try again later.',
          retryAfter: '1 hour'
        });
      }
    });

    // API key rate limiting
    this.apiKeyRateLimit = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 1000, // Limit each API key to 1000 requests per minute
      keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
      message: {
        error: 'API rate limit exceeded, please try again later.',
        retryAfter: '1 minute'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`API rate limit exceeded for key: ${req.headers['x-api-key']}`);
        res.status(429).json({
          error: 'API rate limit exceeded, please try again later.',
          retryAfter: '1 minute'
        });
      }
    });
  }

  /**
   * Setup CORS configuration
   */
  setupCORS() {
    this.corsOptions = {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3344',
          'https://alicesolutionsgroup.com',
          'https://www.alicesolutionsgroup.com',
          'https://smartstart.alicesolutionsgroup.com'
        ];

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS policy violation from origin: ${origin}`);
          callback(new Error('Not allowed by CORS policy'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-API-Key'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      maxAge: 86400 // 24 hours
    };
  }

  /**
   * Setup additional security headers
   */
  setupSecurityHeaders() {
    this.securityHeaders = (req, res, next) => {
      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      // Add cache control for sensitive endpoints
      if (req.path.includes('/api/auth/') || req.path.includes('/api/users/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }

      next();
    };
  }

  /**
   * IP whitelist/blacklist middleware
   */
  ipFilter = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // Check blacklist
    const blacklistedIPs = [
      '127.0.0.1' // Example blacklisted IP
      // Add more blacklisted IPs as needed
    ];

    if (blacklistedIPs.includes(clientIP)) {
      logger.warn(`Blocked request from blacklisted IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address has been blocked'
      });
    }

    // Check whitelist for admin endpoints
    if (req.path.startsWith('/api/admin/')) {
      const whitelistedIPs = [
        '127.0.0.1',
        '::1'
        // Add admin IPs here
      ];

      if (!whitelistedIPs.includes(clientIP)) {
        logger.warn(`Unauthorized admin access attempt from IP: ${clientIP}`);
        return res.status(403).json({
          error: 'Access denied',
          message: 'Admin access restricted to authorized IPs'
        });
      }
    }

    next();
  };

  /**
   * Request sanitization middleware
   */
  requestSanitizer = (req, res, next) => {
    // Sanitize request body
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    next();
  };

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.securityManager.sanitizeInput(obj);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = this.securityManager.sanitizeInput(value);
      }
    }

    return sanitized;
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection = (req, res, next) => {
    // Skip CSRF for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for API key authentication
    if (req.headers['x-api-key']) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'];
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      logger.warn(`CSRF token validation failed for IP: ${req.ip}`);
      return res.status(403).json({
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token'
      });
    }

    next();
  };

  /**
   * API key validation middleware
   */
  apiKeyValidation = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide a valid API key'
      });
    }

    try {
      // Validate API key
      const { User, ApiKey } = require('../services/databaseService');
      const keyHash = this.securityManager.hashApiKey(apiKey);

      const apiKeyRecord = await ApiKey.findOne({
        where: { keyHash, isActive: true },
        include: [{ model: User, as: 'user' }]
      });

      if (!apiKeyRecord) {
        logger.warn(`Invalid API key attempt from IP: ${req.ip}`);
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is invalid or expired'
        });
      }

      // Update last used timestamp
      await apiKeyRecord.update({ lastUsed: new Date() });

      // Attach user to request
      req.user = apiKeyRecord.user;
      req.apiKey = apiKeyRecord;

      next();
    } catch (error) {
      logger.error('API key validation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate API key'
      });
    }
  };

  /**
   * Security event logging middleware
   */
  securityEventLogger = (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Log security events
      if (res.statusCode >= 400) {
        const { SecurityEvent } = require('../services/databaseService');

        SecurityEvent.create({
          userId: req.user?.id || null,
          eventType: this.getEventType(res.statusCode, req.path),
          severity: this.getSeverity(res.statusCode),
          description: `HTTP ${res.statusCode} on ${req.method} ${req.path}`,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
          }
        }).catch((error) => {
          logger.error('Failed to log security event:', error);
        });
      }

      originalSend.call(this, data);
    };

    next();
  };

  /**
   * Get event type based on status code and path
   */
  getEventType(statusCode, path) {
    if (path.includes('/auth/')) {
      return statusCode === 401 ? 'failed_login' : 'login_attempt';
    }

    if (statusCode === 403) {
      return 'suspicious_activity';
    }

    if (statusCode === 429) {
      return 'rate_limit_exceeded';
    }

    if (statusCode >= 500) {
      return 'system_error';
    }

    return 'general_event';
  }

  /**
   * Get severity based on status code
   */
  getSeverity(statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      return 'medium';
    }

    if (statusCode === 429) {
      return 'low';
    }

    if (statusCode >= 500) {
      return 'high';
    }

    return 'low';
  }

  /**
   * Request size limiting middleware
   */
  requestSizeLimit = (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (contentLength > maxSize) {
      logger.warn(`Request size limit exceeded: ${contentLength} bytes from IP: ${req.ip}`);
      return res.status(413).json({
        error: 'Request entity too large',
        message: 'Request size exceeds the maximum allowed limit'
      });
    }

    next();
  };

  /**
   * File upload security middleware
   */
  fileUploadSecurity = (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const maxFileSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        logger.warn(`Blocked file upload of type: ${file.mimetype} from IP: ${req.ip}`);
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'File type not allowed'
        });
      }

      // Check file size
      if (file.size > maxFileSize) {
        logger.warn(`Blocked file upload of size: ${file.size} bytes from IP: ${req.ip}`);
        return res.status(400).json({
          error: 'File too large',
          message: 'File size exceeds the maximum allowed limit'
        });
      }

      // Check for malicious file names
      if (file.originalname.includes('..') || file.originalname.includes('/')) {
        logger.warn(`Blocked file upload with suspicious name: ${file.originalname} from IP: ${req.ip}`);
        return res.status(400).json({
          error: 'Invalid file name',
          message: 'File name contains invalid characters'
        });
      }
    }

    next();
  };

  /**
   * Get all security middleware
   */
  getMiddleware() {
    return {
      helmet: this.helmetConfig,
      cors: this.corsOptions,
      securityHeaders: this.securityHeaders,
      generalRateLimit: this.generalRateLimit,
      authRateLimit: this.authRateLimit,
      uploadRateLimit: this.uploadRateLimit,
      apiKeyRateLimit: this.apiKeyRateLimit,
      ipFilter: this.ipFilter,
      requestSanitizer: this.requestSanitizer,
      csrfProtection: this.csrfProtection,
      apiKeyValidation: this.apiKeyValidation,
      securityEventLogger: this.securityEventLogger,
      requestSizeLimit: this.requestSizeLimit,
      fileUploadSecurity: this.fileUploadSecurity
    };
  }
}

module.exports = SecurityMiddleware;
