const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'smartstart-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({
          timestamp, level, message, ...meta
        }) => `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`)
      )
    }),

    // Write all logs to file
    new winston.transports.File({
      filename: path.join(logsDir, 'smartstart.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),

    // Write error logs to separate file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    };

    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};

// Add security event logging
const securityLogger = {
  loginAttempt: (email, success, ip) => {
    logger.info('Login Attempt', {
      event: 'login_attempt',
      email,
      success,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  documentAccess: (userId, documentId, action, ip) => {
    logger.info('Document Access', {
      event: 'document_access',
      userId,
      documentId,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  signatureEvent: (userId, documentId, action, ip) => {
    logger.info('Signature Event', {
      event: 'signature_event',
      userId,
      documentId,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  encryptionEvent: (userId, documentId, action, ip) => {
    logger.info('Encryption Event', {
      event: 'encryption_event',
      userId,
      documentId,
      action,
      ip,
      timestamp: new Date().toISOString()
    });
  },

  securityViolation: (type, details, ip) => {
    logger.error('Security Violation', {
      event: 'security_violation',
      type,
      details,
      ip,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  logger,
  requestLogger,
  securityLogger
};
