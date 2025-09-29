const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('agreement', 'contract', 'proposal', 'report', 'other'),
      defaultValue: 'other'
    },
    status: {
      type: DataTypes.ENUM('draft', 'pending', 'signed', 'archived', 'deleted'),
      defaultValue: 'draft'
    },
    version: {
      type: DataTypes.STRING,
      defaultValue: '1.0'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    contentHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isEncrypted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    encryptionKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isSigned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    signedBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    signatureHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isTimestamped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    timestampedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    timestampHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    parentDocumentId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'documents'
  });

  // Instance methods
  Document.prototype.getContentHash = function () {
    const crypto = require('crypto');
    const content = this.content || this.filePath || '';
    return crypto.createHash('sha256').update(content).digest('hex');
  };

  Document.prototype.updateContentHash = async function () {
    this.contentHash = this.getContentHash();
    return this.save();
  };

  Document.prototype.isExpired = function () {
    return this.expiresAt && this.expiresAt < new Date();
  };

  Document.prototype.canBeSigned = function () {
    return this.status === 'pending' && !this.isSigned;
  };

  Document.prototype.canBeModified = function () {
    return this.status === 'draft' && !this.isSigned;
  };

  Document.prototype.markAsSigned = async function (signedBy, signatureHash) {
    this.isSigned = true;
    this.signedAt = new Date();
    this.signedBy = signedBy;
    this.signatureHash = signatureHash;
    this.status = 'signed';
    return this.save();
  };

  Document.prototype.markAsTimestamped = async function (timestampHash) {
    this.isTimestamped = true;
    this.timestampedAt = new Date();
    this.timestampHash = timestampHash;
    return this.save();
  };

  Document.prototype.addTag = async function (tag) {
    const tags = this.tags || [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.tags = tags;
      return this.save();
    }
    return this;
  };

  Document.prototype.removeTag = async function (tag) {
    const tags = this.tags || [];
    const index = tags.indexOf(tag);
    if (index > -1) {
      tags.splice(index, 1);
      this.tags = tags;
      return this.save();
    }
    return this;
  };

  Document.prototype.setPermission = async function (userId, permission) {
    const permissions = this.permissions || {};
    permissions[userId] = permission;
    this.permissions = permissions;
    return this.save();
  };

  Document.prototype.getPermission = function (userId) {
    const permissions = this.permissions || {};
    return permissions[userId] || 'none';
  };

  Document.prototype.hasPermission = function (userId, requiredPermission) {
    const userPermission = this.getPermission(userId);
    const permissionLevels = {
      none: 0,
      read: 1,
      comment: 2,
      edit: 3,
      admin: 4
    };

    return permissionLevels[userPermission] >= permissionLevels[requiredPermission];
  };

  // Class methods
  Document.findByUser = function (userId) {
    return this.findAll({ where: { userId } });
  };

  Document.findByStatus = function (status) {
    return this.findAll({ where: { status } });
  };

  Document.findByType = function (type) {
    return this.findAll({ where: { type } });
  };

  Document.findSigned = function () {
    return this.findAll({ where: { isSigned: true } });
  };

  Document.findTimestamped = function () {
    return this.findAll({ where: { isTimestamped: true } });
  };

  Document.findPublic = function () {
    return this.findAll({ where: { isPublic: true } });
  };

  Document.findExpired = function () {
    return this.findAll({
      where: {
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
  };

  Document.findByTag = function (tag) {
    return this.findAll({
      where: {
        tags: {
          [sequelize.Sequelize.Op.contains]: [tag]
        }
      }
    });
  };

  Document.findByContentHash = function (contentHash) {
    return this.findOne({ where: { contentHash } });
  };

  Document.findVersions = function (parentDocumentId) {
    return this.findAll({
      where: { parentDocumentId },
      order: [['createdAt', 'DESC']]
    });
  };

  return Document;
};
