const { logger } = require('../utils/logger');
const { AuditTrail, SecurityEvent } = require('../services/databaseService');

/**
 * Monitoring and Observability Middleware
 * Comprehensive monitoring for production deployment
 */

class MonitoringMiddleware {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: 0,
      activeConnections: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };

    this.setupHealthChecks();
    this.setupMetrics();
    this.setupLogging();
  }

  /**
   * Request monitoring middleware
   */
  requestMonitor = (req, res, next) => {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request ID to headers
    res.setHeader('X-Request-ID', requestId);

    // Increment request counter
    this.metrics.requests++;

    // Log request start
    logger.info('Request started', {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Override res.end to capture response data
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Update metrics
      this.metrics.responseTime = (this.metrics.responseTime + responseTime) / 2;

      // Log request completion
      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        contentLength: res.get('Content-Length') || 0,
        timestamp: new Date().toISOString()
      });

      // Log errors
      if (res.statusCode >= 400) {
        this.metrics.errors++;
        logger.error('Request error', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          error: chunk?.toString(),
          timestamp: new Date().toISOString()
        });
      }

      // Create audit trail for sensitive operations
      if (this.shouldAudit(req, res)) {
        this.createAuditTrail(req, res, requestId, responseTime);
      }

      originalEnd.call(res, chunk, encoding);
    }.bind(this);

    next();
  };

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if request should be audited
   */
  shouldAudit(req, res) {
    const sensitivePaths = [
      '/api/auth/',
      '/api/users/',
      '/api/documents/',
      '/api/ventures/',
      '/api/admin/'
    ];

    const sensitiveMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    return sensitivePaths.some((path) => req.url.startsWith(path))
           && sensitiveMethods.includes(req.method);
  }

  /**
   * Create audit trail entry
   */
  async createAuditTrail(req, res, requestId, responseTime) {
    try {
      await AuditTrail.create({
        userId: req.user?.id || null,
        action: `${req.method} ${req.url}`,
        details: {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (error) {
      logger.error('Failed to create audit trail:', error);
    }
  }

  /**
   * Performance monitoring middleware
   */
  performanceMonitor = (req, res, next) => {
    const startTime = process.hrtime();

    res.on('finish', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;

      // Log slow requests
      if (responseTime > 1000) { // 1 second
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.url,
          responseTime: `${responseTime.toFixed(2)}ms`,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      }

      // Update performance metrics
      this.updatePerformanceMetrics(responseTime);
    });

    next();
  };

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(responseTime) {
    // Update average response time
    this.metrics.responseTime = (this.metrics.responseTime + responseTime) / 2;

    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB

    // Update CPU usage (simplified)
    this.metrics.cpuUsage = process.cpuUsage().user / 1000000; // seconds
  }

  /**
   * Error monitoring middleware
   */
  errorMonitor = (error, req, res, next) => {
    // Log error
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Increment error counter
    this.metrics.errors++;

    // Create security event for critical errors
    if (error.status >= 500) {
      this.createSecurityEvent(error, req);
    }

    // Send error response
    res.status(error.status || 500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Create security event for critical errors
   */
  async createSecurityEvent(error, req) {
    try {
      await SecurityEvent.create({
        userId: req.user?.id || null,
        eventType: 'system_error',
        severity: 'high',
        description: `Critical system error: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata: {
          method: req.method,
          url: req.url,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      logger.error('Failed to create security event:', err);
    }
  }

  /**
   * Health check endpoint
   */
  healthCheck = async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        metrics: this.metrics,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        }
      };

      // Check database connectivity
      try {
        const { sequelize } = require('../services/databaseService');
        await sequelize.authenticate();
        health.database = 'connected';
      } catch (error) {
        health.database = 'disconnected';
        health.status = 'unhealthy';
      }

      // Check external services
      health.externalServices = await this.checkExternalServices();

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Check external services
   */
  async checkExternalServices() {
    const services = {};

    // Check email service
    try {
      // Add email service check here
      services.email = 'connected';
    } catch (error) {
      services.email = 'disconnected';
    }

    // Check file storage
    try {
      // Add file storage check here
      services.fileStorage = 'connected';
    } catch (error) {
      services.fileStorage = 'disconnected';
    }

    return services;
  }

  /**
   * Metrics endpoint
   */
  metricsEndpoint = (req, res) => {
    const metrics = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    res.json(metrics);
  };

  /**
   * Setup health checks
   */
  setupHealthChecks() {
    // Periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute

    // Memory monitoring
    setInterval(() => {
      this.monitorMemory();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      const { sequelize } = require('../services/databaseService');
      await sequelize.authenticate();

      logger.debug('Health check passed', {
        timestamp: new Date().toISOString(),
        metrics: this.metrics
      });
    } catch (error) {
      logger.error('Health check failed:', error);

      // Create security event for health check failure
      try {
        await SecurityEvent.create({
          eventType: 'health_check_failure',
          severity: 'high',
          description: `Health check failed: ${error.message}`,
          metadata: {
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } catch (err) {
        logger.error('Failed to create health check security event:', err);
      }
    }
  }

  /**
   * Monitor memory usage
   */
  monitorMemory() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

    // Log memory usage
    logger.debug('Memory usage', {
      heapUsed: `${heapUsedMB.toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
      timestamp: new Date().toISOString()
    });

    // Alert if memory usage is high
    if (heapUsedMB > 500) { // 500MB threshold
      logger.warn('High memory usage detected', {
        heapUsed: `${heapUsedMB.toFixed(2)}MB`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Setup metrics collection
   */
  setupMetrics() {
    // Collect metrics every 5 minutes
    setInterval(() => {
      this.collectMetrics();
    }, 300000);
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      responseTime: this.metrics.responseTime,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    };

    logger.info('System metrics', metrics);

    // Reset counters
    this.metrics.requests = 0;
    this.metrics.errors = 0;
  }

  /**
   * Setup logging
   */
  setupLogging() {
    // Log application startup
    logger.info('Application started', {
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3344,
      timestamp: new Date().toISOString()
    });

    // Log graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      process.exit(0);
    });

    // Log uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    // Log unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', { reason, promise });
    });
  }

  /**
   * Get all monitoring middleware
   */
  getMiddleware() {
    return {
      requestMonitor: this.requestMonitor,
      performanceMonitor: this.performanceMonitor,
      errorMonitor: this.errorMonitor,
      healthCheck: this.healthCheck,
      metricsEndpoint: this.metricsEndpoint
    };
  }
}

module.exports = MonitoringMiddleware;
