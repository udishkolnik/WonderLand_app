const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

/**
 * Military-Grade Security Module for SmartStart Platform
 * Implements enterprise-level security measures
 */

class SecurityManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.jwtSecret = process.env.JWT_SECRET || this.generateJWTSecret();
    this.saltRounds = 12;
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours
    this.maxLoginAttempts = 5;
    this.lockoutTime = 15 * 60 * 1000; // 15 minutes
  }

  /**
   * Generate secure encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure JWT secret
   */
  generateJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Hash password with salt
   */
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return { hash, salt };
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate secure API key
   */
  generateApiKey() {
    const prefix = 'sk_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  }

  /**
   * Hash API key for storage
   */
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      logger.error('Data encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData, iv) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Data decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  isStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength
           && hasUpperCase
           && hasLowerCase
           && hasNumbers
           && hasSpecialChar;
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim();
  }

  /**
   * Validate IP address
   */
  isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if IP is in whitelist
   */
  isIPWhitelisted(ip, whitelist) {
    return whitelist.includes(ip);
  }

  /**
   * Check if IP is in blacklist
   */
  isIPBlacklisted(ip, blacklist) {
    return blacklist.includes(ip);
  }

  /**
   * Generate secure file hash
   */
  generateFileHash(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Generate secure document signature
   */
  generateDocumentSignature(content, privateKey) {
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const signature = crypto.createSign('RSA-SHA256').update(hash).sign(privateKey, 'hex');
    return signature;
  }

  /**
   * Verify document signature
   */
  verifyDocumentSignature(content, signature, publicKey) {
    try {
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const verifier = crypto.createVerify('RSA-SHA256').update(hash);
      return verifier.verify(publicKey, signature, 'hex');
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate secure timestamp
   */
  generateTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Validate timestamp
   */
  isValidTimestamp(timestamp) {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }

  /**
   * Check if timestamp is expired
   */
  isTimestampExpired(timestamp, maxAge = 300000) { // 5 minutes default
    const now = new Date().getTime();
    const timestampTime = new Date(timestamp).getTime();
    return (now - timestampTime) > maxAge;
  }

  /**
   * Generate secure nonce
   */
  generateNonce() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate nonce
   */
  isValidNonce(nonce) {
    return typeof nonce === 'string' && nonce.length === 32;
  }

  /**
   * Generate secure challenge
   */
  generateChallenge() {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Validate challenge response
   */
  validateChallengeResponse(challenge, response, expectedHash) {
    const hash = crypto.createHash('sha256').update(challenge + response).digest('hex');
    return hash === expectedHash;
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier, limit = 100, window = 3600000) { // 100 requests per hour
    const now = Date.now();
    const windowStart = now - window;

    // This would typically use Redis or similar
    // For now, we'll use a simple in-memory approach
    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const key = `${identifier}_${Math.floor(now / window)}`;
    const current = this.rateLimitStore.get(key) || 0;

    if (current >= limit) {
      return false;
    }

    this.rateLimitStore.set(key, current + 1);
    return true;
  }

  /**
   * Clean up rate limit store
   */
  cleanupRateLimitStore() {
    if (this.rateLimitStore) {
      const now = Date.now();
      const window = 3600000; // 1 hour
      const cutoff = Math.floor((now - window) / window);

      for (const [key] of this.rateLimitStore) {
        const keyTime = parseInt(key.split('_')[1]);
        if (keyTime < cutoff) {
          this.rateLimitStore.delete(key);
        }
      }
    }
  }

  /**
   * Generate secure backup key
   */
  generateBackupKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Encrypt backup data
   */
  encryptBackup(data, key) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      logger.error('Backup encryption failed:', error);
      throw new Error('Backup encryption failed');
    }
  }

  /**
   * Decrypt backup data
   */
  decryptBackup(encryptedData, iv, key) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Backup decryption failed:', error);
      throw new Error('Backup decryption failed');
    }
  }

  /**
   * Generate secure audit hash
   */
  generateAuditHash(data) {
    const content = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Validate audit hash
   */
  validateAuditHash(data, expectedHash) {
    const actualHash = this.generateAuditHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Generate secure recovery token
   */
  generateRecoveryToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate recovery token
   */
  isValidRecoveryToken(token) {
    return typeof token === 'string' && token.length === 64;
  }

  /**
   * Generate secure verification code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate verification code
   */
  isValidVerificationCode(code) {
    return /^\d{6}$/.test(code);
  }

  /**
   * Generate secure QR code data
   */
  generateQRCodeData(data) {
    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();
    const hash = crypto.createHash('sha256').update(data + timestamp + nonce).digest('hex');

    return {
      data,
      timestamp,
      nonce,
      hash
    };
  }

  /**
   * Validate QR code data
   */
  validateQRCodeData(qrData) {
    try {
      const {
        data, timestamp, nonce, hash
      } = qrData;
      const expectedHash = crypto.createHash('sha256').update(data + timestamp + nonce).digest('hex');

      return hash === expectedHash
             && this.isValidTimestamp(timestamp)
             && !this.isTimestampExpired(timestamp, 300000); // 5 minutes
    } catch (error) {
      return false;
    }
  }
}

module.exports = SecurityManager;
