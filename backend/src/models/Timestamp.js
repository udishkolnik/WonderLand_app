const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Timestamp = sequelize.define('Timestamp', {
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
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    dataHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timestampHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    combinedHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    algorithm: {
      type: DataTypes.STRING,
      defaultValue: 'SHA256'
    },
    source: {
      type: DataTypes.ENUM('internal', 'external', 'tsa'),
      defaultValue: 'internal'
    },
    tsaUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tsaResponse: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    chainHash: {
      type: DataTypes.STRING,
      allowNull: true
    },
    previousTimestampId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'timestamps',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
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
    }
  }, {
    tableName: 'timestamps'
  });

  // Instance methods
  Timestamp.prototype.generateDataHash = function (data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  Timestamp.prototype.generateTimestampHash = function () {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(this.timestamp.toISOString()).digest('hex');
  };

  Timestamp.prototype.generateCombinedHash = function (userId) {
    const crypto = require('crypto');
    const data = `${this.dataHash}:${this.timestampHash}:${userId || 'default'}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  Timestamp.prototype.updateHashes = async function (data, userId) {
    this.dataHash = this.generateDataHash(data);
    this.timestampHash = this.generateTimestampHash();
    this.combinedHash = this.generateCombinedHash(userId);
    return this.save();
  };

  Timestamp.prototype.verify = async function (originalData, userId) {
    try {
      const computedDataHash = this.generateDataHash(originalData);
      const computedTimestampHash = this.generateTimestampHash();
      const computedCombinedHash = this.generateCombinedHash(userId);

      const isValid = (
        computedDataHash === this.dataHash
        && computedTimestampHash === this.timestampHash
        && computedCombinedHash === this.combinedHash
      );

      this.isVerified = isValid;
      this.verifiedAt = new Date();
      this.verificationMethod = 'hash_verification';
      this.verificationResult = {
        dataHashMatch: computedDataHash === this.dataHash,
        timestampHashMatch: computedTimestampHash === this.timestampHash,
        combinedHashMatch: computedCombinedHash === this.combinedHash,
        isValid,
        computedDataHash,
        computedTimestampHash,
        computedCombinedHash
      };

      return this.save();
    } catch (error) {
      this.isVerified = false;
      this.verificationResult = { error: error.message };
      return this.save();
    }
  };

  Timestamp.prototype.isValid = function () {
    return this.isVerified;
  };

  Timestamp.prototype.getTimestampInfo = function () {
    return {
      id: this.id,
      timestamp: this.timestamp,
      dataHash: this.dataHash,
      timestampHash: this.timestampHash,
      combinedHash: this.combinedHash,
      algorithm: this.algorithm,
      source: this.source,
      isVerified: this.isVerified,
      action: this.action,
      chainHash: this.chainHash
    };
  };

  Timestamp.prototype.setChainHash = async function (previousTimestamp) {
    if (previousTimestamp) {
      this.previousTimestampId = previousTimestamp.id;
      this.chainHash = this.generateChainHash(previousTimestamp.chainHash);
    } else {
      this.chainHash = this.generateChainHash();
    }
    return this.save();
  };

  Timestamp.prototype.generateChainHash = function (previousChainHash = null) {
    const crypto = require('crypto');
    const data = `${this.combinedHash}:${this.timestamp.toISOString()}:${previousChainHash || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  Timestamp.prototype.getTimestampChain = async function () {
    const chain = [];
    let current = this;

    while (current) {
      chain.unshift(current.getTimestampInfo());
      if (current.previousTimestampId) {
        current = await Timestamp.findByPk(current.previousTimestampId);
      } else {
        current = null;
      }
    }

    return chain;
  };

  Timestamp.prototype.verifyChain = async function () {
    const chain = await this.getTimestampChain();

    for (let i = 0; i < chain.length; i++) {
      const current = chain[i];
      const previous = i > 0 ? chain[i - 1] : null;

      if (previous && current.chainHash !== this.generateChainHash(previous.chainHash)) {
        return false;
      }
    }

    return true;
  };

  // Class methods
  Timestamp.findByDocument = function (documentId) {
    return this.findAll({
      where: { documentId },
      order: [['timestamp', 'ASC']]
    });
  };

  Timestamp.findByDataHash = function (dataHash) {
    return this.findOne({ where: { dataHash } });
  };

  Timestamp.findByTimestampHash = function (timestampHash) {
    return this.findOne({ where: { timestampHash } });
  };

  Timestamp.findByCombinedHash = function (combinedHash) {
    return this.findOne({ where: { combinedHash } });
  };

  Timestamp.findByChainHash = function (chainHash) {
    return this.findOne({ where: { chainHash } });
  };

  Timestamp.findVerified = function () {
    return this.findAll({ where: { isVerified: true } });
  };

  Timestamp.findBySource = function (source) {
    return this.findAll({ where: { source } });
  };

  Timestamp.findByDateRange = function (startDate, endDate) {
    return this.findAll({
      where: {
        timestamp: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'DESC']]
    });
  };

  Timestamp.findByAction = function (action) {
    return this.findAll({ where: { action } });
  };

  Timestamp.getTimestampStatistics = async function () {
    const total = await this.count();
    const verified = await this.count({ where: { isVerified: true } });
    const internal = await this.count({ where: { source: 'internal' } });
    const external = await this.count({ where: { source: 'external' } });
    const tsa = await this.count({ where: { source: 'tsa' } });

    return {
      total,
      verified,
      internal,
      external,
      tsa,
      verificationRate: total > 0 ? (verified / total) * 100 : 0,
      internalRate: total > 0 ? (internal / total) * 100 : 0,
      externalRate: total > 0 ? (external / total) * 100 : 0,
      tsaRate: total > 0 ? (tsa / total) * 100 : 0
    };
  };

  Timestamp.createTimestampChain = async function (documentId, actions, userId) {
    const timestamps = [];
    let previousTimestamp = null;

    for (const action of actions) {
      const timestamp = await this.create({
        documentId,
        action,
        timestamp: new Date(),
        dataHash: this.generateDataHash(JSON.stringify(action)),
        timestampHash: this.generateTimestampHash(),
        combinedHash: this.generateCombinedHash(userId),
        algorithm: 'SHA256',
        source: 'internal',
        isVerified: true
      });

      if (previousTimestamp) {
        await timestamp.setChainHash(previousTimestamp);
      } else {
        await timestamp.setChainHash(null);
      }

      timestamps.push(timestamp);
      previousTimestamp = timestamp;
    }

    return timestamps;
  };

  return Timestamp;
};
