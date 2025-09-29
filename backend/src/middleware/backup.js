const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { sequelize, backupDatabase, getDatabaseStats } = require('../services/databaseService');
const SecurityManager = require('../database/security');

/**
 * Backup and Recovery Middleware
 * Comprehensive backup system for production deployment
 */

class BackupMiddleware {
  constructor() {
    this.securityManager = new SecurityManager();
    this.backupDir = path.join(__dirname, '../../data/backups');
    this.ensureBackupDirectory();
    this.setupScheduledBackups();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`Backup directory created: ${this.backupDir}`);
    }
  }

  /**
   * Setup scheduled backups
   */
  setupScheduledBackups() {
    // Daily backup at 2 AM
    this.scheduleBackup('0 2 * * *', 'daily');

    // Weekly backup on Sunday at 3 AM
    this.scheduleBackup('0 3 * * 0', 'weekly');

    // Monthly backup on the 1st at 4 AM
    this.scheduleBackup('0 4 1 * *', 'monthly');
  }

  /**
   * Schedule backup
   */
  scheduleBackup(cronExpression, type) {
    // In a real implementation, you would use a cron library like node-cron
    // For now, we'll use setInterval as a simplified version
    const interval = this.getIntervalFromCron(cronExpression, type);

    setInterval(async () => {
      try {
        await this.performBackup(type);
      } catch (error) {
        logger.error(`Scheduled ${type} backup failed:`, error);
      }
    }, interval);

    logger.info(`Scheduled ${type} backup with interval: ${interval}ms`);
  }

  /**
   * Get interval from cron expression (simplified)
   */
  getIntervalFromCron(cronExpression, type) {
    switch (type) {
    case 'daily':
      return 24 * 60 * 60 * 1000; // 24 hours
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000; // 30 days
    default:
      return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  /**
   * Perform backup
   */
  async performBackup(type = 'manual') {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `smartstart-backup-${type}-${timestamp}.db`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      logger.info(`Starting ${type} backup: ${backupFileName}`);

      // Create backup
      const backupResult = await backupDatabase();

      // Encrypt backup
      const encryptedBackup = await this.encryptBackup(backupResult);

      // Write encrypted backup to file
      fs.writeFileSync(backupPath, encryptedBackup);

      // Get file stats
      const stats = fs.statSync(backupPath);
      const fileSize = stats.size;

      // Log backup completion
      const duration = Date.now() - startTime;
      logger.info('Backup completed successfully', {
        type,
        fileName: backupFileName,
        fileSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      // Cleanup old backups
      await this.cleanupOldBackups(type);

      return {
        success: true,
        fileName: backupFileName,
        filePath: backupPath,
        fileSize,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Backup failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Encrypt backup
   */
  async encryptBackup(backupData) {
    try {
      const encryptionKey = this.securityManager.generateBackupKey();
      const { encrypted, iv } = this.securityManager.encryptBackup(backupData, encryptionKey);

      // Store encryption key separately (in production, use a key management service)
      const keyFileName = `backup-key-${Date.now()}.key`;
      const keyPath = path.join(this.backupDir, keyFileName);
      fs.writeFileSync(keyPath, encryptionKey);

      return JSON.stringify({
        encrypted,
        iv,
        keyFileName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Backup encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt backup
   */
  async decryptBackup(backupPath, keyPath) {
    try {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);

      const encryptionKey = fs.readFileSync(keyPath, 'utf8');
      const decryptedData = this.securityManager.decryptBackup(
        backupData.encrypted,
        backupData.iv,
        encryptionKey
      );

      return decryptedData;
    } catch (error) {
      logger.error('Backup decryption failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups(type) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files.filter((file) => file.includes(`backup-${type}`));

      // Keep only the last 7 daily, 4 weekly, and 12 monthly backups
      const keepCount = {
        daily: 7,
        weekly: 4,
        monthly: 12
      };

      if (backupFiles.length > keepCount[type]) {
        // Sort by creation time (newest first)
        const sortedFiles = backupFiles
          .map((file) => ({
            name: file,
            path: path.join(this.backupDir, file),
            stats: fs.statSync(path.join(this.backupDir, file))
          }))
          .sort((a, b) => b.stats.mtime - a.stats.mtime);

        // Remove old backups
        const filesToRemove = sortedFiles.slice(keepCount[type]);
        for (const file of filesToRemove) {
          fs.unlinkSync(file.path);
          logger.info(`Removed old backup: ${file.name}`);
        }
      }
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath, keyPath) {
    const startTime = Date.now();

    try {
      logger.info(`Starting restore from backup: ${backupPath}`);

      // Decrypt backup
      const backupData = await this.decryptBackup(backupPath, keyPath);

      // Restore database
      await this.restoreDatabase(backupData);

      const duration = Date.now() - startTime;
      logger.info('Restore completed successfully', {
        backupPath,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Restore failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Restore database
   */
  async restoreDatabase(backupData) {
    try {
      // Close existing connections
      await sequelize.close();

      // Restore database file
      const dbPath = path.join(__dirname, '../../data/smartstart.db');
      fs.writeFileSync(dbPath, backupData);

      // Reconnect to database
      await sequelize.authenticate();

      logger.info('Database restored successfully');
    } catch (error) {
      logger.error('Database restore failed:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupFiles = files
        .filter((file) => file.startsWith('smartstart-backup-'))
        .map((file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);

          return {
            fileName: file,
            filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            type: this.getBackupType(file)
          };
        })
        .sort((a, b) => b.created - a.created);

      return backupFiles;
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Get backup type from filename
   */
  getBackupType(fileName) {
    if (fileName.includes('-daily-')) return 'daily';
    if (fileName.includes('-weekly-')) return 'weekly';
    if (fileName.includes('-monthly-')) return 'monthly';
    return 'manual';
  }

  /**
   * Backup status endpoint
   */
  backupStatus = async (req, res) => {
    try {
      const backups = this.listBackups();
      const stats = await getDatabaseStats();

      const status = {
        totalBackups: backups.length,
        backupsByType: {
          daily: backups.filter((b) => b.type === 'daily').length,
          weekly: backups.filter((b) => b.type === 'weekly').length,
          monthly: backups.filter((b) => b.type === 'monthly').length,
          manual: backups.filter((b) => b.type === 'manual').length
        },
        latestBackup: backups[0] || null,
        databaseStats: stats,
        backupDirectory: this.backupDir,
        timestamp: new Date().toISOString()
      };

      res.json(status);
    } catch (error) {
      logger.error('Backup status check failed:', error);
      res.status(500).json({
        error: 'Failed to get backup status',
        message: error.message
      });
    }
  };

  /**
   * Manual backup endpoint
   */
  manualBackup = async (req, res) => {
    try {
      const { type = 'manual' } = req.body;

      const result = await this.performBackup(type);

      res.json({
        success: true,
        message: 'Backup completed successfully',
        result
      });
    } catch (error) {
      logger.error('Manual backup failed:', error);
      res.status(500).json({
        error: 'Backup failed',
        message: error.message
      });
    }
  };

  /**
   * Restore endpoint
   */
  restore = async (req, res) => {
    try {
      const { backupPath, keyPath } = req.body;

      if (!backupPath || !keyPath) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'backupPath and keyPath are required'
        });
      }

      const result = await this.restoreFromBackup(backupPath, keyPath);

      res.json({
        success: true,
        message: 'Restore completed successfully',
        result
      });
    } catch (error) {
      logger.error('Restore failed:', error);
      res.status(500).json({
        error: 'Restore failed',
        message: error.message
      });
    }
  };

  /**
   * List backups endpoint
   */
  listBackupsEndpoint = (req, res) => {
    try {
      const backups = this.listBackups();

      res.json({
        success: true,
        backups,
        count: backups.length
      });
    } catch (error) {
      logger.error('Failed to list backups:', error);
      res.status(500).json({
        error: 'Failed to list backups',
        message: error.message
      });
    }
  };

  /**
   * Get all backup middleware
   */
  getMiddleware() {
    return {
      backupStatus: this.backupStatus,
      manualBackup: this.manualBackup,
      restore: this.restore,
      listBackups: this.listBackupsEndpoint
    };
  }
}

module.exports = BackupMiddleware;
