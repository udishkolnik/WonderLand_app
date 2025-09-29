const crypto = require('crypto');
const { logger } = require('./logger');

class TimestampService {
  constructor() {
    this.tsaUrl = process.env.TSA_URL || 'https://freetsa.org/tsr';
    this.tsaUsername = process.env.TSA_USERNAME || '';
    this.tsaPassword = process.env.TSA_PASSWORD || '';
  }

  /**
   * Create a timestamp for data
   * @param {string} data - Data to timestamp
   * @param {string} userId - User ID
   * @returns {Object} - Timestamp data
   */
  createTimestamp(data, userId) {
    try {
      const timestamp = new Date().toISOString();
      const dataHash = crypto.createHash('sha256').update(data).digest('hex');
      const timestampHash = crypto.createHash('sha256').update(timestamp).digest('hex');

      // Create a combined hash for integrity
      const combinedHash = crypto.createHash('sha256')
        .update(dataHash + timestampHash + userId)
        .digest('hex');

      return {
        timestamp,
        dataHash,
        timestampHash,
        combinedHash,
        userId,
        algorithm: 'SHA256',
        verified: true,
        source: 'internal'
      };
    } catch (error) {
      logger.error('Timestamp creation failed:', error);
      throw new Error('Timestamp creation failed');
    }
  }

  /**
   * Verify timestamp integrity
   * @param {Object} timestampData - Timestamp data to verify
   * @param {string} originalData - Original data
   * @param {string} userId - User ID
   * @returns {boolean} - Whether timestamp is valid
   */
  verifyTimestamp(timestampData, originalData, userId) {
    try {
      const {
        timestamp, dataHash, timestampHash, combinedHash
      } = timestampData;

      // Verify data hash
      const computedDataHash = crypto.createHash('sha256').update(originalData).digest('hex');
      if (computedDataHash !== dataHash) {
        return false;
      }

      // Verify timestamp hash
      const computedTimestampHash = crypto.createHash('sha256').update(timestamp).digest('hex');
      if (computedTimestampHash !== timestampHash) {
        return false;
      }

      // Verify combined hash
      const computedCombinedHash = crypto.createHash('sha256')
        .update(dataHash + timestampHash + userId)
        .digest('hex');

      return computedCombinedHash === combinedHash;
    } catch (error) {
      logger.error('Timestamp verification failed:', error);
      return false;
    }
  }

  /**
   * Create timestamp chain for document
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} previousTimestamp - Previous timestamp in chain
   * @returns {Object} - Timestamp chain entry
   */
  createTimestampChain(documentId, userId, action, previousTimestamp = null) {
    try {
      const timestamp = new Date().toISOString();
      const actionData = JSON.stringify({
        documentId,
        userId,
        action,
        timestamp,
        previousHash: previousTimestamp ? previousTimestamp.chainHash : null
      });

      const actionHash = crypto.createHash('sha256').update(actionData).digest('hex');
      const chainHash = crypto.createHash('sha256')
        .update(actionHash + (previousTimestamp ? previousTimestamp.chainHash : ''))
        .digest('hex');

      return {
        timestamp,
        documentId,
        userId,
        action,
        actionHash,
        chainHash,
        previousHash: previousTimestamp ? previousTimestamp.chainHash : null,
        algorithm: 'SHA256',
        verified: true,
        source: 'internal'
      };
    } catch (error) {
      logger.error('Timestamp chain creation failed:', error);
      throw new Error('Timestamp chain creation failed');
    }
  }

  /**
   * Verify timestamp chain
   * @param {Array} timestampChain - Array of timestamp chain entries
   * @returns {boolean} - Whether chain is valid
   */
  verifyTimestampChain(timestampChain) {
    try {
      if (!Array.isArray(timestampChain) || timestampChain.length === 0) {
        return false;
      }

      for (let i = 0; i < timestampChain.length; i++) {
        const current = timestampChain[i];
        const previous = i > 0 ? timestampChain[i - 1] : null;

        // Verify current entry
        const actionData = JSON.stringify({
          documentId: current.documentId,
          userId: current.userId,
          action: current.action,
          timestamp: current.timestamp,
          previousHash: previous ? previous.chainHash : null
        });

        const computedActionHash = crypto.createHash('sha256').update(actionData).digest('hex');
        if (computedActionHash !== current.actionHash) {
          return false;
        }

        const computedChainHash = crypto.createHash('sha256')
          .update(computedActionHash + (previous ? previous.chainHash : ''))
          .digest('hex');

        if (computedChainHash !== current.chainHash) {
          return false;
        }

        // Verify previous hash reference
        if (previous && current.previousHash !== previous.chainHash) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Timestamp chain verification failed:', error);
      return false;
    }
  }

  /**
   * Create document audit trail
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Audit trail entry
   */
  createAuditTrail(documentId, userId, action, metadata = {}) {
    try {
      const timestamp = new Date().toISOString();
      const auditData = {
        documentId,
        userId,
        action,
        timestamp,
        metadata,
        ip: metadata.ip || 'unknown',
        userAgent: metadata.userAgent || 'unknown'
      };

      const auditHash = crypto.createHash('sha256').update(JSON.stringify(auditData)).digest('hex');

      return {
        ...auditData,
        auditHash,
        algorithm: 'SHA256',
        verified: true,
        source: 'internal'
      };
    } catch (error) {
      logger.error('Audit trail creation failed:', error);
      throw new Error('Audit trail creation failed');
    }
  }

  /**
   * Verify audit trail entry
   * @param {Object} auditEntry - Audit trail entry
   * @returns {boolean} - Whether audit entry is valid
   */
  verifyAuditTrail(auditEntry) {
    try {
      const { auditHash, ...auditData } = auditEntry;
      const computedHash = crypto.createHash('sha256').update(JSON.stringify(auditData)).digest('hex');
      return computedHash === auditHash;
    } catch (error) {
      logger.error('Audit trail verification failed:', error);
      return false;
    }
  }

  /**
   * Create notarization timestamp
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} documentHash - Document hash
   * @returns {Object} - Notarization timestamp
   */
  createNotarization(documentId, userId, documentHash) {
    try {
      const timestamp = new Date().toISOString();
      const notarizationData = {
        documentId,
        userId,
        documentHash,
        timestamp,
        type: 'notarization',
        status: 'notarized'
      };

      const notarizationHash = crypto.createHash('sha256').update(JSON.stringify(notarizationData)).digest('hex');

      return {
        ...notarizationData,
        notarizationHash,
        algorithm: 'SHA256',
        verified: true,
        source: 'internal'
      };
    } catch (error) {
      logger.error('Notarization creation failed:', error);
      throw new Error('Notarization creation failed');
    }
  }

  /**
   * Verify notarization
   * @param {Object} notarization - Notarization data
   * @param {string} documentHash - Document hash to verify against
   * @returns {boolean} - Whether notarization is valid
   */
  verifyNotarization(notarization, documentHash) {
    try {
      const { notarizationHash, ...notarizationData } = notarization;

      // Verify document hash
      if (notarizationData.documentHash !== documentHash) {
        return false;
      }

      // Verify notarization hash
      const computedHash = crypto.createHash('sha256').update(JSON.stringify(notarizationData)).digest('hex');
      return computedHash === notarizationHash;
    } catch (error) {
      logger.error('Notarization verification failed:', error);
      return false;
    }
  }

  /**
   * Get timestamp statistics
   * @param {Array} timestamps - Array of timestamps
   * @returns {Object} - Statistics
   */
  getTimestampStatistics(timestamps) {
    try {
      if (!Array.isArray(timestamps) || timestamps.length === 0) {
        return {
          total: 0,
          verified: 0,
          failed: 0,
          averageTime: 0,
          firstTimestamp: null,
          lastTimestamp: null
        };
      }

      const verified = timestamps.filter((t) => t.verified).length;
      const failed = timestamps.length - verified;

      const timestamps_sorted = timestamps.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const firstTimestamp = timestamps_sorted[0];
      const lastTimestamp = timestamps_sorted[timestamps_sorted.length - 1];

      const averageTime = timestamps.reduce((sum, t) => sum + new Date(t.timestamp).getTime(), 0) / timestamps.length;

      return {
        total: timestamps.length,
        verified,
        failed,
        averageTime: new Date(averageTime).toISOString(),
        firstTimestamp: firstTimestamp.timestamp,
        lastTimestamp: lastTimestamp.timestamp
      };
    } catch (error) {
      logger.error('Timestamp statistics calculation failed:', error);
      return {
        total: 0,
        verified: 0,
        failed: 0,
        averageTime: 0,
        firstTimestamp: null,
        lastTimestamp: null
      };
    }
  }
}

// Create singleton instance
const timestampService = new TimestampService();

module.exports = {
  timestampService,
  TimestampService
};
