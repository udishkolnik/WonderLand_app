const crypto = require('crypto');
const { logger } = require('./logger');

class EncryptionService {
  constructor() {
    this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
    this.key = this.generateOrGetKey();
    this.ivLength = 16; // For GCM, this is 12 bytes, but we'll use 16 for compatibility
  }

  /**
   * Generate or retrieve encryption key
   */
  generateOrGetKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey && envKey.length === 32) {
      return Buffer.from(envKey, 'hex');
    }

    // Generate a new key if none exists
    const newKey = crypto.randomBytes(32);
    logger.warn('Generated new encryption key. Please set ENCRYPTION_KEY in environment variables.');
    return newKey;
  }

  /**
   * Encrypt data
   * @param {string} text - Text to encrypt
   * @param {string} userId - User ID for additional security
   * @returns {Object} - Encrypted data with IV and auth tag
   */
  encrypt(text, userId = null) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.key);
      cipher.setAAD(Buffer.from(userId || 'default', 'utf8'));

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} userId - User ID for additional security
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedData, userId = null) {
    try {
      const {
        encrypted, iv, authTag, algorithm
      } = encryptedData;

      if (algorithm !== this.algorithm) {
        throw new Error('Algorithm mismatch');
      }

      const decipher = crypto.createDecipher(algorithm, this.key);
      decipher.setAAD(Buffer.from(userId || 'default', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash data (one-way)
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} - Hashed data
   */
  hash(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256');
    hash.update(data + actualSalt);
    return {
      hash: hash.digest('hex'),
      salt: actualSalt
    };
  }

  /**
   * Verify hash
   * @param {string} data - Original data
   * @param {string} hash - Hashed data
   * @param {string} salt - Salt used
   * @returns {boolean} - Whether hash matches
   */
  verifyHash(data, hash, salt) {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }

  /**
   * Generate secure random string
   * @param {number} length - Length of string
   * @returns {string} - Random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate document encryption key
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @returns {string} - Document-specific encryption key
   */
  generateDocumentKey(documentId, userId) {
    const data = `${documentId}:${userId}:${Date.now()}`;
    return this.hash(data).hash;
  }

  /**
   * Encrypt file content
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {string} documentId - Document ID
   * @param {string} userId - User ID
   * @returns {Object} - Encrypted file data
   */
  encryptFile(fileBuffer, documentId, userId) {
    try {
      const documentKey = this.generateDocumentKey(documentId, userId);
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, Buffer.from(documentKey, 'hex'));

      let encrypted = cipher.update(fileBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      const authTag = cipher.getAuthTag();

      return {
        encrypted: encrypted.toString('base64'),
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: this.algorithm,
        documentKey,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('File encryption failed:', error);
      throw new Error('File encryption failed');
    }
  }

  /**
   * Decrypt file content
   * @param {Object} encryptedFileData - Encrypted file data
   * @param {string} documentKey - Document encryption key
   * @returns {Buffer} - Decrypted file content
   */
  decryptFile(encryptedFileData, documentKey) {
    try {
      const {
        encrypted, iv, authTag, algorithm
      } = encryptedFileData;

      if (algorithm !== this.algorithm) {
        throw new Error('Algorithm mismatch');
      }

      const decipher = crypto.createDecipher(algorithm, Buffer.from(documentKey, 'hex'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error) {
      logger.error('File decryption failed:', error);
      throw new Error('File decryption failed');
    }
  }

  /**
   * Create digital signature
   * @param {string} data - Data to sign
   * @param {string} privateKey - Private key for signing
   * @returns {Object} - Digital signature
   */
  createSignature(data, privateKey) {
    try {
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();

      const signature = sign.sign(privateKey, 'hex');

      return {
        signature,
        algorithm: 'SHA256',
        timestamp: new Date().toISOString(),
        dataHash: crypto.createHash('sha256').update(data).digest('hex')
      };
    } catch (error) {
      logger.error('Signature creation failed:', error);
      throw new Error('Signature creation failed');
    }
  }

  /**
   * Verify digital signature
   * @param {string} data - Original data
   * @param {string} signature - Digital signature
   * @param {string} publicKey - Public key for verification
   * @returns {boolean} - Whether signature is valid
   */
  verifySignature(data, signature, publicKey) {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      return verify.verify(publicKey, signature, 'hex');
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate key pair for digital signatures
   * @returns {Object} - Public and private key pair
   */
  generateKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      return {
        publicKey,
        privateKey,
        algorithm: 'RSA',
        keySize: 2048,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Key pair generation failed:', error);
      throw new Error('Key pair generation failed');
    }
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

module.exports = {
  encryptionService,
  EncryptionService
};
