const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Signature = sequelize.define('Signature', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
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
    signatureType: {
      type: DataTypes.ENUM('digital', 'electronic', 'biometric', 'handwritten'),
      defaultValue: 'digital'
    },
    signatureData: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    signatureHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    publicKey: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    certificate: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    algorithm: {
      type: DataTypes.STRING,
      defaultValue: 'SHA256'
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verificationMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verificationResult: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revocationReason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    signatureImage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    signaturePosition: {
      type: DataTypes.JSON,
      allowNull: true
    },
    signaturePage: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    signatureField: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isTimestamped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    timestampHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestampedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    chainHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    previousSignatureId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'signatures',
        key: 'id'
      }
    }
  }, {
    tableName: 'signatures'
  });

  // Instance methods
  Signature.prototype.generateSignatureHash = function () {
    const crypto = require('crypto');
    const data = `${this.documentId}:${this.userId}:${this.signatureData}:${this.signedAt}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  Signature.prototype.updateSignatureHash = async function () {
    this.signatureHash = this.generateSignatureHash();
    return this.save();
  };

  Signature.prototype.verify = async function () {
    try {
      // This would typically involve cryptographic verification
      // For now, we'll mark it as verified if the hash matches
      const computedHash = this.generateSignatureHash();
      this.isVerified = computedHash === this.signatureHash;
      this.verifiedAt = new Date();
      this.verificationMethod = 'hash_verification';
      this.verificationResult = {
        hashMatch: computedHash === this.signatureHash,
        computedHash,
        storedHash: this.signatureHash
      };

      return this.save();
    } catch (error) {
      this.isVerified = false;
      this.verificationResult = { error: error.message };
      return this.save();
    }
  };

  Signature.prototype.revoke = async function (reason) {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revocationReason = reason;
    return this.save();
  };

  Signature.prototype.isValid = function () {
    return this.isVerified && !this.isRevoked;
  };

  Signature.prototype.getSignatureInfo = function () {
    return {
      id: this.id,
      signatureType: this.signatureType,
      algorithm: this.algorithm,
      signedAt: this.signedAt,
      isVerified: this.isVerified,
      isRevoked: this.isRevoked,
      signatureHash: this.signatureHash,
      timestampHash: this.timestampHash,
      chainHash: this.chainHash
    };
  };

  Signature.prototype.addTimestamp = async function (timestampHash) {
    this.isTimestamped = true;
    this.timestampHash = timestampHash;
    this.timestampedAt = new Date();
    return this.save();
  };

  Signature.prototype.setChainHash = async function (previousSignature) {
    if (previousSignature) {
      this.previousSignatureId = previousSignature.id;
      this.chainHash = this.generateChainHash(previousSignature.chainHash);
    } else {
      this.chainHash = this.generateChainHash();
    }
    return this.save();
  };

  Signature.prototype.generateChainHash = function (previousChainHash = null) {
    const crypto = require('crypto');
    const data = `${this.signatureHash}:${this.signedAt}:${previousChainHash || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  Signature.prototype.getSignatureChain = async function () {
    const chain = [];
    let current = this;

    while (current) {
      chain.unshift(current.getSignatureInfo());
      if (current.previousSignatureId) {
        current = await Signature.findByPk(current.previousSignatureId);
      } else {
        current = null;
      }
    }

    return chain;
  };

  // Class methods
  Signature.findByDocument = function (documentId) {
    return this.findAll({
      where: { documentId },
      order: [['signedAt', 'ASC']]
    });
  };

  Signature.findByUser = function (userId) {
    return this.findAll({
      where: { userId },
      order: [['signedAt', 'DESC']]
    });
  };

  Signature.findVerified = function () {
    return this.findAll({ where: { isVerified: true } });
  };

  Signature.findRevoked = function () {
    return this.findAll({ where: { isRevoked: true } });
  };

  Signature.findBySignatureHash = function (signatureHash) {
    return this.findOne({ where: { signatureHash } });
  };

  Signature.findByTimestampHash = function (timestampHash) {
    return this.findOne({ where: { timestampHash } });
  };

  Signature.findByChainHash = function (chainHash) {
    return this.findOne({ where: { chainHash } });
  };

  Signature.findByDateRange = function (startDate, endDate) {
    return this.findAll({
      where: {
        signedAt: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['signedAt', 'DESC']]
    });
  };

  Signature.getSignatureStatistics = async function () {
    const total = await this.count();
    const verified = await this.count({ where: { isVerified: true } });
    const revoked = await this.count({ where: { isRevoked: true } });
    const timestamped = await this.count({ where: { isTimestamped: true } });

    return {
      total,
      verified,
      revoked,
      timestamped,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      revocationRate: total > 0 ? (revoked / total) * 100 : 0,
      timestampRate: total > 0 ? (timestamped / total) * 100 : 0
    };
  };

  return Signature;
};
