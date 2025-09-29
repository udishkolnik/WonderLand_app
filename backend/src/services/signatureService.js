const fs = require('fs');
const path = require('path');
const { timestampService } = require('../utils/timestamp');
const { logger } = require('../utils/logger');
const { encryptionService } = require('../utils/encryption');

class SignatureService {
  constructor() {
    this.timestampService = timestampService;
    this.encryptionService = encryptionService;
    this.initialized = false;
  }

  /**
   * Initialize signature service
   */
  async initialize() {
    try {
      // Create signature directories
      const signatureDir = path.join(__dirname, '../../data/signatures');
      if (!fs.existsSync(signatureDir)) {
        fs.mkdirSync(signatureDir, { recursive: true });
      }

      // Encryption service is already initialized as a singleton

      this.initialized = true;
      logger.info('Signature service initialized successfully');
    } catch (error) {
      logger.error('Signature service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create digital signature for document
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} content - Document content
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Digital signature data
   */
  async createDocumentSignature(documentId, userId, content, metadata = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Signature service not initialized');
      }

      // Create digital signature
      const signatureData = await this.encryptionService.createDocumentSignature(content, userId);

      // Create timestamp
      const timestampData = this.timestampService.createTimestamp(content, userId);

      // Create signature hash
      const signatureHash = this.generateSignatureHash(documentId, userId, signatureData.signature, timestampData.timestamp);

      // Create chain hash if this is part of a signature chain
      const chainHash = this.generateChainHash(signatureHash, metadata.previousSignatureHash);

      return {
        signature: signatureData.signature,
        signatureHash,
        chainHash,
        algorithm: signatureData.algorithm,
        dataHash: signatureData.dataHash,
        publicKey: signatureData.publicKey,
        timestamp: timestampData.timestamp,
        timestampHash: timestampData.combinedHash,
        metadata: {
          ...metadata,
          documentId,
          userId,
          signatureType: 'digital',
          source: 'internal'
        }
      };
    } catch (error) {
      logger.error('Document signature creation failed:', error);
      throw error;
    }
  }

  /**
   * Verify digital signature
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} content - Document content
   * @param {Object} signatureData - Signature data to verify
   * @returns {Object} - Verification result
   */
  async verifyDocumentSignature(documentId, userId, content, signatureData) {
    try {
      if (!this.initialized) {
        throw new Error('Signature service not initialized');
      }

      // Verify digital signature
      const signatureValid = await this.encryptionService.verifyDocumentSignature(
        content,
        signatureData.signature,
        signatureData.publicKey
      );

      // Verify timestamp
      const timestampValid = this.timestampService.verifyTimestamp(
        {
          timestamp: signatureData.timestamp,
          dataHash: signatureData.dataHash,
          timestampHash: signatureData.timestampHash,
          combinedHash: signatureData.timestampHash
        },
        content,
        userId
      );

      // Verify signature hash
      const computedSignatureHash = this.generateSignatureHash(
        documentId,
        userId,
        signatureData.signature,
        signatureData.timestamp
      );
      const hashValid = computedSignatureHash === signatureData.signatureHash;

      // Verify chain hash if present
      let chainValid = true;
      if (signatureData.chainHash) {
        const computedChainHash = this.generateChainHash(
          signatureData.signatureHash,
          signatureData.metadata?.previousSignatureHash
        );
        chainValid = computedChainHash === signatureData.chainHash;
      }

      const overallValid = signatureValid && timestampValid && hashValid && chainValid;

      return {
        valid: overallValid,
        signatureValid,
        timestampValid,
        hashValid,
        chainValid,
        verificationDetails: {
          signatureAlgorithm: signatureData.algorithm,
          timestamp: signatureData.timestamp,
          dataHash: signatureData.dataHash,
          signatureHash: signatureData.signatureHash,
          chainHash: signatureData.chainHash
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Document signature verification failed:', error);
      return {
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Create signature chain for document
   * @param {string} documentId - Document ID
   * @param {Array} signers - Array of signer information
   * @param {string} content - Document content
   * @returns {Array} - Array of signature chain entries
   */
  async createSignatureChain(documentId, signers, content) {
    try {
      if (!this.initialized) {
        throw new Error('Signature service not initialized');
      }

      const signatureChain = [];
      let previousSignatureHash = null;

      for (const signer of signers) {
        const signatureData = await this.createDocumentSignature(
          documentId,
          signer.userId,
          content,
          {
            signerName: signer.name,
            signerRole: signer.role,
            previousSignatureHash
          }
        );

        signatureChain.push({
          ...signatureData,
          signer: {
            userId: signer.userId,
            name: signer.name,
            role: signer.role
          }
        });

        previousSignatureHash = signatureData.signatureHash;
      }

      return signatureChain;
    } catch (error) {
      logger.error('Signature chain creation failed:', error);
      throw error;
    }
  }

  /**
   * Verify signature chain
   * @param {string} documentId - Document ID
   * @param {string} content - Document content
   * @param {Array} signatureChain - Signature chain to verify
   * @returns {Object} - Verification result
   */
  async verifySignatureChain(documentId, content, signatureChain) {
    try {
      if (!this.initialized) {
        throw new Error('Signature service not initialized');
      }

      const verificationResults = [];
      let overallValid = true;
      let previousSignatureHash = null;

      for (const signatureEntry of signatureChain) {
        const verification = await this.verifyDocumentSignature(
          documentId,
          signatureEntry.signer.userId,
          content,
          signatureEntry
        );

        // Check chain continuity
        if (previousSignatureHash && signatureEntry.metadata?.previousSignatureHash !== previousSignatureHash) {
          verification.chainValid = false;
          overallValid = false;
        }

        verificationResults.push({
          signer: signatureEntry.signer,
          verification
        });

        previousSignatureHash = signatureEntry.signatureHash;

        if (!verification.valid) {
          overallValid = false;
        }
      }

      return {
        valid: overallValid,
        chainLength: signatureChain.length,
        verificationResults,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Signature chain verification failed:', error);
      return {
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate signature hash
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} signature - Digital signature
   * @param {string} timestamp - Timestamp
   * @returns {string} - Signature hash
   */
  generateSignatureHash(documentId, userId, signature, timestamp) {
    const crypto = require('crypto');
    const data = `${documentId}:${userId}:${signature}:${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate chain hash
   * @param {string} signatureHash - Current signature hash
   * @param {string} previousSignatureHash - Previous signature hash
   * @returns {string} - Chain hash
   */
  generateChainHash(signatureHash, previousSignatureHash = null) {
    const crypto = require('crypto');
    const data = `${signatureHash}:${previousSignatureHash || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create notarization for document
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} content - Document content
   * @returns {Object} - Notarization data
   */
  async createNotarization(documentId, userId, content) {
    try {
      if (!this.initialized) {
        throw new Error('Signature service not initialized');
      }

      // Create document hash
      const documentHash = await this.encryptionService.hashDocument(content);

      // Create notarization timestamp
      const notarization = this.timestampService.createNotarization(documentId, userId, documentHash.hash);

      return {
        notarizationHash: notarization.notarizationHash,
        documentHash: documentHash.hash,
        timestamp: notarization.timestamp,
        algorithm: 'SHA256',
        source: 'internal',
        metadata: {
          documentId,
          userId,
          type: 'notarization',
          status: 'notarized'
        }
      };
    } catch (error) {
      logger.error('Document notarization failed:', error);
      throw error;
    }
  }

  /**
   * Verify notarization
   * @param {string} documentId - Document ID
   * @param {string} content - Document content
   * @param {Object} notarizationData - Notarization data to verify
   * @returns {Object} - Verification result
   */
  async verifyNotarization(documentId, content, notarizationData) {
    try {
      if (!this.initialized) {
        throw new Error('Signature service not initialized');
      }

      // Create document hash
      const documentHash = await this.encryptionService.hashDocument(content);

      // Verify notarization
      const notarizationValid = this.timestampService.verifyNotarization(
        notarizationData,
        documentHash.hash
      );

      return {
        valid: notarizationValid,
        documentHash: documentHash.hash,
        notarizationHash: notarizationData.notarizationHash,
        timestamp: notarizationData.timestamp,
        verificationDetails: {
          algorithm: notarizationData.algorithm,
          source: notarizationData.source,
          status: notarizationData.metadata?.status
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Notarization verification failed:', error);
      return {
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get signature statistics
   * @returns {Object} - Signature statistics
   */
  getSignatureStats() {
    return {
      initialized: this.initialized,
      algorithm: 'SHA256',
      timestampService: this.timestampService.constructor.name,
      encryptionService: this.encryptionService.constructor.name,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create signature audit trail
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Audit trail entry
   */
  createSignatureAuditTrail(documentId, userId, action, metadata = {}) {
    return this.timestampService.createAuditTrail(documentId, userId, action, {
      ...metadata,
      service: 'signature',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Verify signature audit trail
   * @param {Object} auditEntry - Audit trail entry
   * @returns {boolean} - Whether audit entry is valid
   */
  verifySignatureAuditTrail(auditEntry) {
    return this.timestampService.verifyAuditTrail(auditEntry);
  }
}

// Create singleton instance
const signatureServiceInstance = new SignatureService();

module.exports = {
  signatureServiceInstance,
  SignatureService
};
