const fs = require('fs');
const path = require('path');
const { encryptionService } = require('../utils/encryption');
const { logger } = require('../utils/logger');

class EncryptionService {
  constructor() {
    this.encryptionService = encryptionService;
    this.initialized = false;
  }

  /**
   * Initialize encryption service
   */
  async initialize() {
    try {
      // Create encryption directories
      const encryptionDir = path.join(__dirname, '../../data/encryption');
      if (!fs.existsSync(encryptionDir)) {
        fs.mkdirSync(encryptionDir, { recursive: true });
      }

      // Generate or load encryption keys
      await this.initializeKeys();

      this.initialized = true;
      logger.info('Encryption service initialized successfully');
    } catch (error) {
      logger.error('Encryption service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize encryption keys
   */
  async initializeKeys() {
    try {
      const keysDir = path.join(__dirname, '../../data/encryption/keys');
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }

      // Check if keys exist
      const masterKeyPath = path.join(keysDir, 'master.key');
      const publicKeyPath = path.join(keysDir, 'public.pem');
      const privateKeyPath = path.join(keysDir, 'private.pem');

      if (!fs.existsSync(masterKeyPath)) {
        // Generate new master key
        const masterKey = this.encryptionService.generateRandomString(32);
        fs.writeFileSync(masterKeyPath, masterKey);
        logger.info('Generated new master encryption key');
      }

      if (!fs.existsSync(publicKeyPath) || !fs.existsSync(privateKeyPath)) {
        // Generate new key pair
        const keyPair = this.encryptionService.generateKeyPair();
        fs.writeFileSync(publicKeyPath, keyPair.publicKey);
        fs.writeFileSync(privateKeyPath, keyPair.privateKey);
        logger.info('Generated new encryption key pair');
      }

      // Load keys
      this.masterKey = fs.readFileSync(masterKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');

      logger.info('Encryption keys loaded successfully');
    } catch (error) {
      logger.error('Failed to initialize encryption keys:', error);
      throw error;
    }
  }

  /**
   * Encrypt document content
   * @param {string} content - Document content
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @returns {Object} - Encrypted content and metadata
   */
  async encryptDocument(content, documentId, userId) {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Generate document-specific encryption key
      const documentKey = this.encryptionService.generateDocumentKey(documentId, userId);

      // Encrypt the content
      const encryptedData = this.encryptionService.encrypt(content, userId);

      // Create signature for integrity
      const signature = this.encryptionService.createSignature(content, this.privateKey);

      return {
        encryptedContent: encryptedData.encrypted,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
        algorithm: encryptedData.algorithm,
        documentKey,
        signature: signature.signature,
        signatureAlgorithm: signature.algorithm,
        dataHash: signature.dataHash,
        timestamp: encryptedData.timestamp
      };
    } catch (error) {
      logger.error('Document encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt document content
   * @param {Object} encryptedData - Encrypted document data
   * @param {string} documentKey - Document encryption key
   * @param {string} userId - User ID
   * @returns {string} - Decrypted content
   */
  async decryptDocument(encryptedData, documentKey, userId) {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Decrypt the content
      const decryptedContent = this.encryptionService.decrypt(encryptedData, userId);

      return decryptedContent;
    } catch (error) {
      logger.error('Document decryption failed:', error);
      throw error;
    }
  }

  /**
   * Encrypt file
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @returns {Object} - Encrypted file data
   */
  async encryptFile(fileBuffer, documentId, userId) {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Encrypt the file
      const encryptedFileData = this.encryptionService.encryptFile(fileBuffer, documentId, userId);

      return encryptedFileData;
    } catch (error) {
      logger.error('File encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt file
   * @param {Object} encryptedFileData - Encrypted file data
   * @param {string} documentKey - Document encryption key
   * @returns {Buffer} - Decrypted file content
   */
  async decryptFile(encryptedFileData, documentKey) {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Decrypt the file
      const decryptedFileBuffer = this.encryptionService.decryptFile(encryptedFileData, documentKey);

      return decryptedFileBuffer;
    } catch (error) {
      logger.error('File decryption failed:', error);
      throw error;
    }
  }

  /**
   * Create digital signature for document
   * @param {string} content - Document content
   * @param {string} userId - User ID
   * @returns {Object} - Digital signature
   */
  async createDocumentSignature(content, userId) {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Create signature
      const signature = this.encryptionService.createSignature(content, this.privateKey);

      return {
        signature: signature.signature,
        algorithm: signature.algorithm,
        dataHash: signature.dataHash,
        timestamp: signature.timestamp,
        publicKey: this.publicKey
      };
    } catch (error) {
      logger.error('Document signature creation failed:', error);
      throw error;
    }
  }

  /**
   * Verify digital signature
   * @param {string} content - Document content
   * @param {string} signature - Digital signature
   * @param {string} publicKey - Public key for verification
   * @returns {boolean} - Whether signature is valid
   */
  async verifyDocumentSignature(content, signature, publicKey) {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Verify signature
      const isValid = this.encryptionService.verifySignature(content, signature, publicKey);

      return isValid;
    } catch (error) {
      logger.error('Document signature verification failed:', error);
      return false;
    }
  }

  /**
   * Hash document content
   * @param {string} content - Document content
   * @returns {Object} - Hash and salt
   */
  async hashDocument(content) {
    try {
      const hashResult = this.encryptionService.hash(content);

      return {
        hash: hashResult.hash,
        salt: hashResult.salt,
        algorithm: 'SHA256'
      };
    } catch (error) {
      logger.error('Document hashing failed:', error);
      throw error;
    }
  }

  /**
   * Verify document hash
   * @param {string} content - Document content
   * @param {string} hash - Stored hash
   * @param {string} salt - Salt used for hashing
   * @returns {boolean} - Whether hash is valid
   */
  async verifyDocumentHash(content, hash, salt) {
    try {
      const isValid = this.encryptionService.verifyHash(content, hash, salt);

      return isValid;
    } catch (error) {
      logger.error('Document hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of string
   * @returns {string} - Random string
   */
  generateSecureRandomString(length = 32) {
    return this.encryptionService.generateRandomString(length);
  }

  /**
   * Encrypt sensitive metadata
   * @param {Object} metadata - Metadata to encrypt
   * @param {string} userId - User ID
   * @returns {Object} - Encrypted metadata
   */
  async encryptMetadata(metadata, userId) {
    try {
      const metadataString = JSON.stringify(metadata);
      const encryptedMetadata = this.encryptionService.encrypt(metadataString, userId);

      return encryptedMetadata;
    } catch (error) {
      logger.error('Metadata encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive metadata
   * @param {Object} encryptedMetadata - Encrypted metadata
   * @param {string} userId - User ID
   * @returns {Object} - Decrypted metadata
   */
  async decryptMetadata(encryptedMetadata, userId) {
    try {
      const decryptedString = this.encryptionService.decrypt(encryptedMetadata, userId);
      const metadata = JSON.parse(decryptedString);

      return metadata;
    } catch (error) {
      logger.error('Metadata decryption failed:', error);
      throw error;
    }
  }

  /**
   * Get encryption statistics
   * @returns {Object} - Encryption statistics
   */
  getEncryptionStats() {
    return {
      initialized: this.initialized,
      algorithm: this.encryptionService.algorithm,
      keyLength: 256,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Rotate encryption keys
   * @returns {boolean} - Whether key rotation was successful
   */
  async rotateKeys() {
    try {
      if (!this.initialized) {
        throw new Error('Encryption service not initialized');
      }

      // Generate new key pair
      const newKeyPair = this.encryptionService.generateKeyPair();

      // Save new keys
      const keysDir = path.join(__dirname, '../../data/encryption/keys');
      const publicKeyPath = path.join(keysDir, 'public.pem');
      const privateKeyPath = path.join(keysDir, 'private.pem');

      fs.writeFileSync(publicKeyPath, newKeyPair.publicKey);
      fs.writeFileSync(privateKeyPath, newKeyPair.privateKey);

      // Update loaded keys
      this.publicKey = newKeyPair.publicKey;
      this.privateKey = newKeyPair.privateKey;

      logger.info('Encryption keys rotated successfully');
      return true;
    } catch (error) {
      logger.error('Key rotation failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const encryptionServiceInstance = new EncryptionService();

module.exports = {
  encryptionServiceInstance,
  EncryptionService
};
