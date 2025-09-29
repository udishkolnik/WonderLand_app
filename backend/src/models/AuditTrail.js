const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditTrail = sequelize.define('AuditTrail', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'documents',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    entityType: {
      type: DataTypes.ENUM('document', 'signature', 'timestamp', 'user', 'system'),
      defaultValue: 'document'
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    oldValues: {
      type: DataTypes.JSON,
      allowNull: true
    },
    newValues: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    requestId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'low'
    },
    category: {
      type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'sign', 'verify', 'encrypt', 'decrypt', 'login', 'logout', 'error', 'security'),
      defaultValue: 'read'
    },
    isSuccessful: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    auditHash: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'audit_trails'
  });

  // Instance methods
  AuditTrail.prototype.generateAuditHash = function () {
    const crypto = require('crypto');
    const auditData = {
      documentId: this.documentId,
      userId: this.userId,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      oldValues: this.oldValues,
      newValues: this.newValues,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      sessionId: this.sessionId,
      requestId: this.requestId,
      metadata: this.metadata,
      severity: this.severity,
      category: this.category,
      isSuccessful: this.isSuccessful,
      errorMessage: this.errorMessage,
      duration: this.duration,
      timestamp: this.createdAt
    };

    return crypto.createHash('sha256').update(JSON.stringify(auditData)).digest('hex');
  };

  AuditTrail.prototype.updateAuditHash = async function () {
    this.auditHash = this.generateAuditHash();
    return this.save();
  };

  AuditTrail.prototype.verify = function () {
    const computedHash = this.generateAuditHash();
    return computedHash === this.auditHash;
  };

  AuditTrail.prototype.getAuditInfo = function () {
    return {
      id: this.id,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      severity: this.severity,
      category: this.category,
      isSuccessful: this.isSuccessful,
      createdAt: this.createdAt,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      auditHash: this.auditHash
    };
  };

  AuditTrail.prototype.getChanges = function () {
    return {
      oldValues: this.oldValues,
      newValues: this.newValues,
      changes: this.calculateChanges()
    };
  };

  AuditTrail.prototype.calculateChanges = function () {
    if (!this.oldValues || !this.newValues) {
      return {};
    }

    const changes = {};
    const allKeys = new Set([...Object.keys(this.oldValues), ...Object.keys(this.newValues)]);

    for (const key of allKeys) {
      const oldValue = this.oldValues[key];
      const newValue = this.newValues[key];

      if (oldValue !== newValue) {
        changes[key] = {
          from: oldValue,
          to: newValue
        };
      }
    }

    return changes;
  };

  // Class methods
  AuditTrail.findByDocument = function (documentId) {
    return this.findAll({
      where: { documentId },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findByUser = function (userId) {
    return this.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findByAction = function (action) {
    return this.findAll({
      where: { action },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findByEntity = function (entityType, entityId) {
    return this.findAll({
      where: { entityType, entityId },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findBySeverity = function (severity) {
    return this.findAll({
      where: { severity },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findByCategory = function (category) {
    return this.findAll({
      where: { category },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findSuccessful = function () {
    return this.findAll({
      where: { isSuccessful: true },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findFailed = function () {
    return this.findAll({
      where: { isSuccessful: false },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findByDateRange = function (startDate, endDate) {
    return this.findAll({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findByIpAddress = function (ipAddress) {
    return this.findAll({
      where: { ipAddress },
      order: [['createdAt', 'DESC']]
    });
  };

  AuditTrail.findBySession = function (sessionId) {
    return this.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']]
    });
  };

  AuditTrail.getAuditStatistics = async function () {
    const total = await this.count();
    const successful = await this.count({ where: { isSuccessful: true } });
    const failed = await this.count({ where: { isSuccessful: false } });
    const critical = await this.count({ where: { severity: 'critical' } });
    const high = await this.count({ where: { severity: 'high' } });
    const medium = await this.count({ where: { severity: 'medium' } });
    const low = await this.count({ where: { severity: 'low' } });

    return {
      total,
      successful,
      failed,
      critical,
      high,
      medium,
      low,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
      criticalRate: total > 0 ? (critical / total) * 100 : 0
    };
  };

  AuditTrail.createAuditEntry = async function (data) {
    const auditEntry = await this.create({
      ...data,
      auditHash: '' // Will be set by the hook
    });

    // Update the hash after creation
    await auditEntry.updateAuditHash();

    return auditEntry;
  };

  AuditTrail.logDocumentAction = async function (documentId, userId, action, metadata = {}) {
    return this.createAuditEntry({
      documentId,
      userId,
      action,
      entityType: 'document',
      entityId: documentId,
      category: this.getCategoryFromAction(action),
      severity: this.getSeverityFromAction(action),
      metadata
    });
  };

  AuditTrail.logSignatureAction = async function (documentId, userId, action, metadata = {}) {
    return this.createAuditEntry({
      documentId,
      userId,
      action,
      entityType: 'signature',
      entityId: documentId,
      category: 'sign',
      severity: 'high',
      metadata
    });
  };

  AuditTrail.logSecurityEvent = async function (userId, action, severity, metadata = {}) {
    return this.createAuditEntry({
      userId,
      action,
      entityType: 'system',
      category: 'security',
      severity,
      metadata
    });
  };

  AuditTrail.getCategoryFromAction = function (action) {
    const actionCategories = {
      create: 'create',
      read: 'read',
      update: 'update',
      delete: 'delete',
      sign: 'sign',
      verify: 'verify',
      encrypt: 'encrypt',
      decrypt: 'decrypt',
      login: 'login',
      logout: 'logout'
    };

    return actionCategories[action.toLowerCase()] || 'read';
  };

  AuditTrail.getSeverityFromAction = function (action) {
    const actionSeverities = {
      create: 'medium',
      read: 'low',
      update: 'medium',
      delete: 'high',
      sign: 'high',
      verify: 'medium',
      encrypt: 'high',
      decrypt: 'high',
      login: 'medium',
      logout: 'low'
    };

    return actionSeverities[action.toLowerCase()] || 'low';
  };

  return AuditTrail;
};
