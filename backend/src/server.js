const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Import services and middleware
const { initializeDatabase } = require('./services/databaseService');
const { logger } = require('./utils/logger');
const SecurityMiddleware = require('./middleware/security');
const MonitoringMiddleware = require('./middleware/monitoring');
const BackupMiddleware = require('./middleware/backup');

// Import controllers
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const documentController = require('./controllers/documentController');
const legalController = require('./controllers/legalController');
const signatureController = require('./controllers/signatureController');
const dashboardController = require('./controllers/dashboardController');
const ventureController = require('./controllers/ventureController');
const subscriptionController = require('./controllers/subscriptionController');
const billingController = require('./controllers/billingController');

// Import middleware
const { auth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { rbacSystem } = require('./middleware/rbac');

/**
 * SmartStart Platform Server
 * Military-grade production server with comprehensive security
 */

class SmartStartServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3344;
    this.securityMiddleware = new SecurityMiddleware();
    this.monitoringMiddleware = new MonitoringMiddleware();
    this.backupMiddleware = new BackupMiddleware();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  setupMiddleware() {
    // Security middleware
    const security = this.securityMiddleware.getMiddleware();
    this.app.use(security.helmet);
    this.app.use(cors(security.cors));
    this.app.use(security.securityHeaders);
    this.app.use(security.ipFilter);
    this.app.use(security.requestSanitizer);
    this.app.use(security.requestSizeLimit);

    // Monitoring middleware
    const monitoring = this.monitoringMiddleware.getMiddleware();
    this.app.use(monitoring.requestMonitor);
    this.app.use(monitoring.performanceMonitor);

    // General middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    // Rate limiting
    this.app.use(security.generalRateLimit);
    this.app.use('/api/auth/', security.authRateLimit);
    this.app.use('/api/documents/upload', security.uploadRateLimit);
    this.app.use('/api/', security.apiKeyRateLimit);

    // Static files
    this.app.use(express.static(path.join(__dirname, '../../public')));
  }

  /**
   * Setup routes
   */
  setupRoutes() {
    // Health and monitoring endpoints
    const monitoring = this.monitoringMiddleware.getMiddleware();
    this.app.get('/api/health', monitoring.healthCheck);
    this.app.get('/api/metrics', monitoring.metricsEndpoint);

    // Backup endpoints (temporarily disabled for testing)
    // const backup = this.backupMiddleware.getMiddleware();
    // this.app.get('/api/backup/status', auth, backup.backupStatus);
    // this.app.post('/api/backup/manual', auth, backup.manualBackup);
    // this.app.post('/api/backup/restore', auth, backup.restore);
    // this.app.get('/api/backup/list', auth, backup.listBackups);

    // API routes
    this.app.use('/api/auth', authController);
    this.app.use('/api/users', userController);
    this.app.use('/api/documents', documentController);
    this.app.use('/api/legal', legalController);
    this.app.use('/api/signatures', signatureController);
    this.app.use('/api/dashboard', dashboardController);
    this.app.use('/api/ventures', ventureController);
    this.app.use('/api/subscriptions', subscriptionController);
    this.app.use('/api/billing', billingController);

    // Serve frontend
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    const monitoring = this.monitoringMiddleware.getMiddleware();

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    });

    // Error handler
    this.app.use(monitoring.errorMonitor);
    this.app.use(errorHandler);
  }

  /**
   * Start server
   */
  async start() {
    try {
      // Initialize database
      await initializeDatabase();
      logger.info('Database initialized successfully');

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`SmartStart Platform server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Health check: http://localhost:${this.port}/api/health`);
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);

      this.server.close(() => {
        logger.info('HTTP server closed');

        // Close database connections
        const { closeDatabase } = require('./services/databaseService');
        closeDatabase().then(() => {
          logger.info('Database connections closed');
          process.exit(0);
        }).catch((error) => {
          logger.error('Error closing database connections:', error);
          process.exit(1);
        });
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }
}

// Create server instance
const server = new SmartStartServer();

// Only auto-start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.start().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

module.exports = server;
