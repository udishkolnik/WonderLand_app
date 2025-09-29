const { Sequelize } = require('sequelize');
const { logger } = require('../utils/logger');

/**
 * Database Migrations for SmartStart Platform
 * Military-grade production database schema
 */

class DatabaseMigrations {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.queryInterface = sequelize.getQueryInterface();
  }

  /**
   * Run all migrations
   */
  async runMigrations() {
    try {
      logger.info('Starting database migrations...');

      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();

      // Get completed migrations
      const completedMigrations = await this.getCompletedMigrations();

      // Run pending migrations
      const migrations = [
        '001_create_users_table',
        '002_create_user_profiles_table',
        '003_create_ventures_table',
        '004_create_user_journeys_table',
        '005_create_journey_milestones_table',
        '006_create_team_collaborations_table',
        '007_create_feedback_reviews_table',
        '008_create_documents_table',
        '009_create_signatures_table',
        '010_create_timestamps_table',
        '011_create_audit_trails_table',
        '012_create_sessions_table',
        '013_create_api_keys_table',
        '014_create_security_events_table',
        '015_create_backup_logs_table',
        '016_add_indexes',
        '017_add_constraints',
        '018_add_triggers'
      ];

      for (const migration of migrations) {
        if (!completedMigrations.includes(migration)) {
          logger.info(`Running migration: ${migration}`);
          await this.runMigration(migration);
          await this.markMigrationComplete(migration);
        }
      }

      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create migrations tracking table
   */
  async createMigrationsTable() {
    await this.queryInterface.createTable('migrations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      executed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Get completed migrations
   */
  async getCompletedMigrations() {
    try {
      const [results] = await this.sequelize.query('SELECT name FROM migrations');
      return results.map((row) => row.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Mark migration as complete
   */
  async markMigrationComplete(migrationName) {
    await this.queryInterface.bulkInsert('migrations', [{
      name: migrationName,
      executed_at: new Date()
    }]);
  }

  /**
   * Run specific migration
   */
  async runMigration(migrationName) {
    switch (migrationName) {
    case '001_create_users_table':
      await this.createUsersTable();
      break;
    case '002_create_user_profiles_table':
      await this.createUserProfilesTable();
      break;
    case '003_create_ventures_table':
      await this.createVenturesTable();
      break;
    case '004_create_user_journeys_table':
      await this.createUserJourneysTable();
      break;
    case '005_create_journey_milestones_table':
      await this.createJourneyMilestonesTable();
      break;
    case '006_create_team_collaborations_table':
      await this.createTeamCollaborationsTable();
      break;
    case '007_create_feedback_reviews_table':
      await this.createFeedbackReviewsTable();
      break;
    case '008_create_documents_table':
      await this.createDocumentsTable();
      break;
    case '009_create_signatures_table':
      await this.createSignaturesTable();
      break;
    case '010_create_timestamps_table':
      await this.createTimestampsTable();
      break;
    case '011_create_audit_trails_table':
      await this.createAuditTrailsTable();
      break;
    case '012_create_sessions_table':
      await this.createSessionsTable();
      break;
    case '013_create_api_keys_table':
      await this.createApiKeysTable();
      break;
    case '014_create_security_events_table':
      await this.createSecurityEventsTable();
      break;
    case '015_create_backup_logs_table':
      await this.createBackupLogsTable();
      break;
    case '016_add_indexes':
      await this.addIndexes();
      break;
    case '017_add_constraints':
      await this.addConstraints();
      break;
    case '018_add_triggers':
      await this.addTriggers();
      break;
    default:
      throw new Error(`Unknown migration: ${migrationName}`);
    }
  }

  /**
   * Create users table with military-grade security
   */
  async createUsersTable() {
    await this.queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      salt: {
        type: Sequelize.STRING(32),
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      company: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      role: {
        type: Sequelize.ENUM('admin', 'member', 'contributor', 'viewer'),
        allowNull: false,
        defaultValue: 'member'
      },
      subscription_status: {
        type: Sequelize.ENUM('trial', 'active', 'suspended', 'cancelled'),
        allowNull: false,
        defaultValue: 'trial'
      },
      subscription_start: {
        type: Sequelize.DATE,
        allowNull: true
      },
      subscription_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      email_verification_token: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      password_reset_token: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      password_reset_expires: {
        type: Sequelize.DATE,
        allowNull: true
      },
      two_factor_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      two_factor_secret: {
        type: Sequelize.STRING(32),
        allowNull: true
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      locked_until: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create user profiles table
   */
  async createUserProfilesTable() {
    await this.queryInterface.createTable('user_profiles', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      skills: {
        type: Sequelize.JSON,
        allowNull: true
      },
      experience_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        allowNull: true
      },
      interests: {
        type: Sequelize.JSON,
        allowNull: true
      },
      avatar_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      linkedin_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      github_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      portfolio_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create ventures table
   */
  async createVenturesTable() {
    await this.queryInterface.createTable('ventures', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      problem_statement: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      target_market: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('idea', 'development', 'beta', 'launched', 'paused', 'cancelled'),
        allowNull: false,
        defaultValue: 'idea'
      },
      stage: {
        type: Sequelize.ENUM('discovery', 'sprint_0', 'mvp_build', 'beta_test', 'scale_kill'),
        allowNull: false,
        defaultValue: 'discovery'
      },
      founder_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      team_members: {
        type: Sequelize.JSON,
        allowNull: true
      },
      equity_distribution: {
        type: Sequelize.JSON,
        allowNull: true
      },
      financial_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create user journeys table
   */
  async createUserJourneysTable() {
    await this.queryInterface.createTable('user_journeys', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      venture_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ventures',
          key: 'id'
        }
      },
      stage: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      stage_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create journey milestones table
   */
  async createJourneyMilestonesTable() {
    await this.queryInterface.createTable('journey_milestones', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      journey_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'user_journeys',
          key: 'id'
        }
      },
      milestone_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create team collaborations table
   */
  async createTeamCollaborationsTable() {
    await this.queryInterface.createTable('team_collaborations', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      venture_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ventures',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      equity_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      joined_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'removed'),
        allowNull: false,
        defaultValue: 'active'
      }
    });
  }

  /**
   * Create feedback reviews table
   */
  async createFeedbackReviewsTable() {
    await this.queryInterface.createTable('feedback_reviews', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      venture_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ventures',
          key: 'id'
        }
      },
      reviewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      feedback_text: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      feedback_type: {
        type: Sequelize.ENUM('technical', 'business', 'design', 'general'),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create documents table
   */
  async createDocumentsTable() {
    await this.queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      venture_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ventures',
          key: 'id'
        }
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      file_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      document_type: {
        type: Sequelize.ENUM('nda', 'contributor_agreement', 'terms_of_service', 'privacy_policy', 'other'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'signed', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      encryption_key: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create signatures table
   */
  async createSignaturesTable() {
    await this.queryInterface.createTable('signatures', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      signature_data: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      signature_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      signed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });
  }

  /**
   * Create timestamps table
   */
  async createTimestampsTable() {
    await this.queryInterface.createTable('timestamps', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'documents',
          key: 'id'
        }
      },
      timestamp_hash: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      timestamp_proof: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create audit trails table
   */
  async createAuditTrailsTable() {
    await this.queryInterface.createTable('audit_trails', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'documents',
          key: 'id'
        }
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      details: {
        type: Sequelize.JSON,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create sessions table
   */
  async createSessionsTable() {
    await this.queryInterface.createTable('sessions', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      session_token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create API keys table
   */
  async createApiKeysTable() {
    await this.queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      key_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      key_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      last_used: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create security events table
   */
  async createSecurityEventsTable() {
    await this.queryInterface.createTable('security_events', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      event_type: {
        type: Sequelize.ENUM('login_attempt', 'failed_login', 'password_change', 'suspicious_activity', 'data_breach_attempt'),
        allowNull: false
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  }

  /**
   * Create backup logs table
   */
  async createBackupLogsTable() {
    await this.queryInterface.createTable('backup_logs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      backup_type: {
        type: Sequelize.ENUM('full', 'incremental', 'differential'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('started', 'completed', 'failed'),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });
  }

  /**
   * Add performance indexes
   */
  async addIndexes() {
    // User indexes
    await this.queryInterface.addIndex('users', ['email']);
    await this.queryInterface.addIndex('users', ['role']);
    await this.queryInterface.addIndex('users', ['subscription_status']);
    await this.queryInterface.addIndex('users', ['is_active']);
    await this.queryInterface.addIndex('users', ['created_at']);

    // Venture indexes
    await this.queryInterface.addIndex('ventures', ['founder_id']);
    await this.queryInterface.addIndex('ventures', ['status']);
    await this.queryInterface.addIndex('ventures', ['stage']);
    await this.queryInterface.addIndex('ventures', ['created_at']);

    // Document indexes
    await this.queryInterface.addIndex('documents', ['user_id']);
    await this.queryInterface.addIndex('documents', ['venture_id']);
    await this.queryInterface.addIndex('documents', ['document_type']);
    await this.queryInterface.addIndex('documents', ['status']);
    await this.queryInterface.addIndex('documents', ['created_at']);

    // Signature indexes
    await this.queryInterface.addIndex('signatures', ['document_id']);
    await this.queryInterface.addIndex('signatures', ['user_id']);
    await this.queryInterface.addIndex('signatures', ['signed_at']);

    // Audit trail indexes
    await this.queryInterface.addIndex('audit_trails', ['user_id']);
    await this.queryInterface.addIndex('audit_trails', ['document_id']);
    await this.queryInterface.addIndex('audit_trails', ['action']);
    await this.queryInterface.addIndex('audit_trails', ['created_at']);

    // Session indexes
    await this.queryInterface.addIndex('sessions', ['user_id']);
    await this.queryInterface.addIndex('sessions', ['session_token']);
    await this.queryInterface.addIndex('sessions', ['expires_at']);
    await this.queryInterface.addIndex('sessions', ['is_active']);

    // Security event indexes
    await this.queryInterface.addIndex('security_events', ['user_id']);
    await this.queryInterface.addIndex('security_events', ['event_type']);
    await this.queryInterface.addIndex('security_events', ['severity']);
    await this.queryInterface.addIndex('security_events', ['created_at']);
  }

  /**
   * Add security constraints
   */
  async addConstraints() {
    // Add check constraints for data validation
    await this.queryInterface.sequelize.query(`
      ALTER TABLE users ADD CONSTRAINT chk_email_format 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')
    `);

    await this.queryInterface.sequelize.query(`
      ALTER TABLE users ADD CONSTRAINT chk_password_length 
      CHECK (LENGTH(password_hash) >= 60)
    `);

    await this.queryInterface.sequelize.query(`
      ALTER TABLE feedback_reviews ADD CONSTRAINT chk_rating_range 
      CHECK (rating >= 1 AND rating <= 5)
    `);

    await this.queryInterface.sequelize.query(`
      ALTER TABLE team_collaborations ADD CONSTRAINT chk_equity_percentage 
      CHECK (equity_percentage >= 0 AND equity_percentage <= 100)
    `);
  }

  /**
   * Add database triggers
   */
  async addTriggers() {
    // Update timestamp trigger
    await this.queryInterface.sequelize.query(`
      CREATE TRIGGER update_users_updated_at 
      BEFORE UPDATE ON users 
      FOR EACH ROW 
      BEGIN 
        NEW.updated_at = CURRENT_TIMESTAMP; 
      END
    `);

    await this.queryInterface.sequelize.query(`
      CREATE TRIGGER update_ventures_updated_at 
      BEFORE UPDATE ON ventures 
      FOR EACH ROW 
      BEGIN 
        NEW.updated_at = CURRENT_TIMESTAMP; 
      END
    `);

    await this.queryInterface.sequelize.query(`
      CREATE TRIGGER update_documents_updated_at 
      BEFORE UPDATE ON documents 
      FOR EACH ROW 
      BEGIN 
        NEW.updated_at = CURRENT_TIMESTAMP; 
      END
    `);

    // Audit trail trigger
    await this.queryInterface.sequelize.query(`
      CREATE TRIGGER audit_user_changes 
      AFTER UPDATE ON users 
      FOR EACH ROW 
      BEGIN 
        INSERT INTO audit_trails (user_id, action, details, created_at) 
        VALUES (NEW.id, 'user_updated', JSON_OBJECT('old', JSON_OBJECT('email', OLD.email, 'role', OLD.role), 'new', JSON_OBJECT('email', NEW.email, 'role', NEW.role)), CURRENT_TIMESTAMP); 
      END
    `);
  }
}

module.exports = DatabaseMigrations;
