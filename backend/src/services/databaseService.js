const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database configuration
const dbConfig = {
  development: {
    dialect: 'sqlite',
    storage: path.join(dataDir, 'smartstart.db'),
    logging: (msg) => logger.debug(msg)
  },
  production: {
    dialect: process.env.DB_TYPE || 'sqlite',
    storage: process.env.DB_PATH || path.join(dataDir, 'smartstart.db'),
    logging: false
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  }
};

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: config.dialect,
  storage: config.storage,
  logging: config.logging,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Import models
const User = require('../models/User')(sequelize);
const Document = require('../models/Document')(sequelize);
const Signature = require('../models/Signature')(sequelize);
const Timestamp = require('../models/Timestamp')(sequelize);
const AuditTrail = require('../models/AuditTrail')(sequelize);
const Venture = require('../models/Venture')(sequelize);
const Subscription = require('../models/Subscription')(sequelize);

// Define associations
const defineAssociations = () => {
  // User associations
  User.hasMany(Document, { foreignKey: 'userId', as: 'documents' });
  User.hasMany(Signature, { foreignKey: 'userId', as: 'signatures' });
  User.hasMany(AuditTrail, { foreignKey: 'userId', as: 'auditTrails' });
  User.hasMany(Venture, { foreignKey: 'founderId', as: 'ventures' });
  User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });

  // Document associations
  Document.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
  Document.hasMany(Signature, { foreignKey: 'documentId', as: 'signatures' });
  Document.hasMany(Timestamp, { foreignKey: 'documentId', as: 'timestamps' });
  Document.hasMany(AuditTrail, { foreignKey: 'documentId', as: 'auditTrails' });

  // Signature associations
  Signature.belongsTo(User, { foreignKey: 'userId', as: 'signer' });
  Signature.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  // Timestamp associations
  Timestamp.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  // AuditTrail associations
  AuditTrail.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  AuditTrail.belongsTo(Document, { foreignKey: 'documentId', as: 'document' });

  // Venture associations
  Venture.belongsTo(User, { foreignKey: 'founderId', as: 'founder' });

  // Subscription associations
  Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });
};

// Initialize database
const initializeDatabase = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Define associations
    defineAssociations();

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synchronized successfully');

    // Create default admin user if it doesn't exist
    await createDefaultAdmin();

    return sequelize;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { email: 'admin@alicesolutionsgroup.com' } });

    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);

      await User.create({
        email: 'admin@alicesolutionsgroup.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailVerified: true
      });

      logger.info('Default admin user created');
    }
  } catch (error) {
    logger.error('Failed to create default admin user:', error);
  }
};

// Database health check
const healthCheck = async () => {
  try {
    await sequelize.authenticate();
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Database statistics
const getDatabaseStats = async () => {
  try {
    const stats = {
      users: await User.count(),
      documents: await Document.count(),
      signatures: await Signature.count(),
      timestamps: await Timestamp.count(),
      auditTrails: await AuditTrail.count(),
      timestamp: new Date().toISOString()
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get database statistics:', error);
    throw error;
  }
};

// Backup database
const backupDatabase = async () => {
  try {
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `smartstart-backup-${timestamp}.db`);

    // For SQLite, we can simply copy the database file
    if (config.dialect === 'sqlite') {
      fs.copyFileSync(config.storage, backupPath);
      logger.info(`Database backed up to: ${backupPath}`);
      return backupPath;
    }

    throw new Error('Backup not implemented for this database type');
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw error;
  }
};

// Restore database
const restoreDatabase = async (backupPath) => {
  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // For SQLite, we can simply copy the backup file
    if (config.dialect === 'sqlite') {
      fs.copyFileSync(backupPath, config.storage);
      logger.info(`Database restored from: ${backupPath}`);
      return true;
    }

    throw new Error('Restore not implemented for this database type');
  } catch (error) {
    logger.error('Database restore failed:', error);
    throw error;
  }
};

// Cleanup old data
const cleanupOldData = async (daysOld = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Clean up old audit trails
    const deletedAuditTrails = await AuditTrail.destroy({
      where: {
        createdAt: {
          [Sequelize.Op.lt]: cutoffDate
        }
      }
    });

    // Clean up old timestamps
    const deletedTimestamps = await Timestamp.destroy({
      where: {
        createdAt: {
          [Sequelize.Op.lt]: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${deletedAuditTrails} audit trails and ${deletedTimestamps} timestamps older than ${daysOld} days`);

    return {
      deletedAuditTrails,
      deletedTimestamps,
      cutoffDate: cutoffDate.toISOString()
    };
  } catch (error) {
    logger.error('Data cleanup failed:', error);
    throw error;
  }
};

// Close database connection
const closeDatabase = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Failed to close database connection:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  initializeDatabase,
  healthCheck,
  getDatabaseStats,
  backupDatabase,
  restoreDatabase,
  cleanupOldData,
  closeDatabase,
  // Export models
  User,
  Document,
  Signature,
  Timestamp,
  AuditTrail,
  Venture,
  Subscription
};
