const request = require('supertest');
const server = require('../src/server');
const app = server.getApp();
const SecurityManager = require('../src/database/security');
const { User, AuditTrail, SecurityEvent } = require('../src/services/databaseService');

/**
 * Military-Grade Security Tests
 * Comprehensive security testing for SmartStart Platform
 */

describe('Security Tests', () => {
  let securityManager;
  let testUser;
  let authToken;

  beforeAll(async () => {
    securityManager = new SecurityManager();

    // Create test user
    testUser = await User.create({
      email: 'security-test@alicesolutionsgroup.com',
      password: 'TestPassword123!',
      firstName: 'Security',
      lastName: 'Test',
      role: 'member',
      isActive: true,
      emailVerified: true
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await User.destroy({ where: { id: testUser.id } });
    }
  });

  describe('Authentication Security', () => {
    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'Password',
        'PASSWORD123',
        'Password123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Password must be strong');
      }
    });

    test('should enforce password complexity', () => {
      const strongPassword = 'StrongPassword123!';
      const weakPassword = 'weak';

      expect(securityManager.isStrongPassword(strongPassword)).toBe(true);
      expect(securityManager.isStrongPassword(weakPassword)).toBe(false);
    });

    test('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const { hash, salt } = await securityManager.hashPassword(password);

      expect(hash).toBeDefined();
      expect(salt).toBeDefined();
      expect(hash.length).toBeGreaterThan(50);
      expect(salt.length).toBeGreaterThan(20);
    });

    test('should verify passwords correctly', async () => {
      const password = 'TestPassword123!';
      const { hash } = await securityManager.hashPassword(password);

      expect(await securityManager.verifyPassword(password, hash)).toBe(true);
      expect(await securityManager.verifyPassword('wrongpassword', hash)).toBe(false);
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        ''
      ];

      for (const email of invalidEmails) {
        expect(securityManager.isValidEmail(email)).toBe(false);
      }
    });

    test('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org',
        'user123@test-domain.com'
      ];

      for (const email of validEmails) {
        expect(securityManager.isValidEmail(email)).toBe(true);
      }
    });
  });

  describe('Session Security', () => {
    test('should generate secure session tokens', () => {
      const token1 = securityManager.generateSessionToken();
      const token2 = securityManager.generateSessionToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
    });

    test('should generate secure API keys', () => {
      const apiKey1 = securityManager.generateApiKey();
      const apiKey2 = securityManager.generateApiKey();

      expect(apiKey1).toBeDefined();
      expect(apiKey2).toBeDefined();
      expect(apiKey1).not.toBe(apiKey2);
      expect(apiKey1.startsWith('sk_')).toBe(true);
      expect(apiKey1).toHaveLength(67); // sk_ + 64 hex chars
    });

    test('should hash API keys for storage', () => {
      const apiKey = securityManager.generateApiKey();
      const hash = securityManager.hashApiKey(apiKey);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(hash).not.toBe(apiKey);
    });
  });

  describe('Data Encryption', () => {
    test('should encrypt and decrypt data', () => {
      const sensitiveData = {
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
        personalInfo: 'This is sensitive information'
      };

      const { encrypted, iv } = securityManager.encryptData(sensitiveData);
      const decrypted = securityManager.decryptData(encrypted, iv);

      expect(encrypted).toBeDefined();
      expect(iv).toBeDefined();
      expect(decrypted).toEqual(sensitiveData);
    });

    test('should generate secure random strings', () => {
      const random1 = securityManager.generateRandomString(16);
      const random2 = securityManager.generateRandomString(16);

      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toBe(random2);
      expect(random1).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    test('should generate secure UUIDs', () => {
      const uuid1 = securityManager.generateUUID();
      const uuid2 = securityManager.generateUUID();

      expect(uuid1).toBeDefined();
      expect(uuid2).toBeDefined();
      expect(uuid1).not.toBe(uuid2);
      expect(uuid1).toHaveLength(36);
      expect(uuid2).toHaveLength(36);
    });
  });

  describe('Input Validation', () => {
    test('should sanitize input data', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sqlInjection = '\'; DROP TABLE users; --';
      const normalInput = 'This is normal text';

      expect(securityManager.sanitizeInput(maliciousInput)).not.toContain('<script>');
      expect(securityManager.sanitizeInput(sqlInjection)).not.toContain('\'');
      expect(securityManager.sanitizeInput(normalInput)).toBe('This is normal text');
    });

    test('should validate IP addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '10.0.0.1',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '::1'
      ];

      const invalidIPs = [
        '256.256.256.256',
        '192.168.1',
        'not-an-ip',
        ''
      ];

      for (const ip of validIPs) {
        expect(securityManager.isValidIP(ip)).toBe(true);
      }

      for (const ip of invalidIPs) {
        expect(securityManager.isValidIP(ip)).toBe(false);
      }
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', () => {
      const identifier = 'test-user';
      const limit = 5;
      const window = 60000; // 1 minute

      // Should allow first 5 requests
      for (let i = 0; i < limit; i++) {
        expect(securityManager.checkRateLimit(identifier, limit, window)).toBe(true);
      }

      // Should reject 6th request
      expect(securityManager.checkRateLimit(identifier, limit, window)).toBe(false);
    });
  });

  describe('File Security', () => {
    test('should generate secure file hashes', () => {
      const fileBuffer = Buffer.from('This is test file content');
      const hash1 = securityManager.generateFileHash(fileBuffer);
      const hash2 = securityManager.generateFileHash(fileBuffer);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).toBe(hash2); // Same content should produce same hash
      expect(hash1).toHaveLength(64);
    });

    test('should generate different hashes for different content', () => {
      const fileBuffer1 = Buffer.from('Content 1');
      const fileBuffer2 = Buffer.from('Content 2');

      const hash1 = securityManager.generateFileHash(fileBuffer1);
      const hash2 = securityManager.generateFileHash(fileBuffer2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Document Signatures', () => {
    test('should generate and verify document signatures', () => {
      const content = 'This is a test document';
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const signature = securityManager.generateDocumentSignature(content, privateKey);
      const isValid = securityManager.verifyDocumentSignature(content, signature, publicKey);

      expect(signature).toBeDefined();
      expect(isValid).toBe(true);
    });

    test('should reject invalid signatures', () => {
      const content = 'This is a test document';
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const signature = securityManager.generateDocumentSignature(content, privateKey);
      const modifiedContent = 'This is a modified document';
      const isValid = securityManager.verifyDocumentSignature(modifiedContent, signature, publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('Timestamp Security', () => {
    test('should generate valid timestamps', () => {
      const timestamp = securityManager.generateTimestamp();

      expect(securityManager.isValidTimestamp(timestamp)).toBe(true);
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });

    test('should detect expired timestamps', () => {
      const oldTimestamp = new Date(Date.now() - 600000).toISOString(); // 10 minutes ago
      const recentTimestamp = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

      expect(securityManager.isTimestampExpired(oldTimestamp, 300000)).toBe(true); // 5 minute max age
      expect(securityManager.isTimestampExpired(recentTimestamp, 300000)).toBe(false);
    });
  });

  describe('Nonce Security', () => {
    test('should generate valid nonces', () => {
      const nonce = securityManager.generateNonce();

      expect(securityManager.isValidNonce(nonce)).toBe(true);
      expect(nonce).toHaveLength(32);
    });

    test('should reject invalid nonces', () => {
      const invalidNonces = [
        'short',
        'this-is-too-long-for-a-nonce',
        '',
        null,
        undefined
      ];

      for (const nonce of invalidNonces) {
        expect(securityManager.isValidNonce(nonce)).toBe(false);
      }
    });
  });

  describe('Challenge-Response Security', () => {
    test('should generate and validate challenges', () => {
      const challenge = securityManager.generateChallenge();
      const response = 'test-response';
      const expectedHash = crypto.createHash('sha256').update(challenge + response).digest('hex');

      expect(securityManager.validateChallengeResponse(challenge, response, expectedHash)).toBe(true);
      expect(securityManager.validateChallengeResponse(challenge, 'wrong-response', expectedHash)).toBe(false);
    });
  });

  describe('Backup Security', () => {
    test('should encrypt and decrypt backup data', () => {
      const backupData = {
        users: [{ id: 1, email: 'test@example.com' }],
        documents: [{ id: 1, title: 'Test Document' }]
      };

      const key = securityManager.generateBackupKey();
      const { encrypted, iv } = securityManager.encryptBackup(backupData, key);
      const decrypted = securityManager.decryptBackup(encrypted, iv, key);

      expect(encrypted).toBeDefined();
      expect(iv).toBeDefined();
      expect(decrypted).toEqual(backupData);
    });
  });

  describe('Audit Security', () => {
    test('should generate consistent audit hashes', () => {
      const data = { a: 1, b: 2, c: 3 };
      const hash1 = securityManager.generateAuditHash(data);
      const hash2 = securityManager.generateAuditHash(data);

      expect(hash1).toBe(hash2);
      expect(securityManager.validateAuditHash(data, hash1)).toBe(true);
    });

    test('should detect audit hash tampering', () => {
      const originalData = { a: 1, b: 2, c: 3 };
      const modifiedData = { a: 1, b: 2, c: 4 };
      const hash = securityManager.generateAuditHash(originalData);

      expect(securityManager.validateAuditHash(modifiedData, hash)).toBe(false);
    });
  });

  describe('Recovery Security', () => {
    test('should generate valid recovery tokens', () => {
      const token = securityManager.generateRecoveryToken();

      expect(securityManager.isValidRecoveryToken(token)).toBe(true);
      expect(token).toHaveLength(64);
    });

    test('should generate valid verification codes', () => {
      const code = securityManager.generateVerificationCode();

      expect(securityManager.isValidVerificationCode(code)).toBe(true);
      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe('QR Code Security', () => {
    test('should generate and validate QR code data', () => {
      const data = 'test-data';
      const qrData = securityManager.generateQRCodeData(data);

      expect(securityManager.validateQRCodeData(qrData)).toBe(true);
      expect(qrData.data).toBe(data);
      expect(qrData.timestamp).toBeDefined();
      expect(qrData.nonce).toBeDefined();
      expect(qrData.hash).toBeDefined();
    });

    test('should reject tampered QR code data', () => {
      const data = 'test-data';
      const qrData = securityManager.generateQRCodeData(data);
      qrData.data = 'tampered-data';

      expect(securityManager.validateQRCodeData(qrData)).toBe(false);
    });
  });

  describe('API Security', () => {
    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });

    test('should reject requests with invalid tokens', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    test('should enforce CORS policies', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .expect(403);

      expect(response.body.message).toContain('CORS policy violation');
    });
  });

  describe('SQL Injection Protection', () => {
    test('should prevent SQL injection in login', async () => {
      const maliciousInput = 'admin\'; DROP TABLE users; --';

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousInput,
          password: 'password'
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid email format');
    });

    test('should prevent SQL injection in search', async () => {
      const maliciousInput = '\'; DROP TABLE documents; --';

      const response = await request(app)
        .get('/api/documents/search')
        .query({ q: maliciousInput })
        .expect(400);

      expect(response.body.message).toContain('Invalid search query');
    });
  });

  describe('XSS Protection', () => {
    test('should sanitize user input in documents', async () => {
      const maliciousInput = '<script>alert("xss")</script>';

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Document',
          content: maliciousInput
        })
        .expect(201);

      expect(response.body.content).not.toContain('<script>');
    });

    test('should escape HTML in user profiles', async () => {
      const maliciousInput = '<img src="x" onerror="alert(\'xss\')">';

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: maliciousInput
        })
        .expect(200);

      expect(response.body.bio).not.toContain('<img');
    });
  });

  describe('CSRF Protection', () => {
    test('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Document',
          content: 'Test content'
        })
        .expect(403);

      expect(response.body.message).toContain('CSRF token required');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age');
    });
  });

  describe('Audit Trail', () => {
    test('should log security events', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Check if security event was logged
      const securityEvent = await SecurityEvent.findOne({
        where: { event_type: 'failed_login' }
      });

      expect(securityEvent).toBeDefined();
      expect(securityEvent.severity).toBe('medium');
    });

    test('should log audit trail for document operations', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Test Document',
          content: 'Test content'
        })
        .expect(201);

      // Check if audit trail was created
      const auditTrail = await AuditTrail.findOne({
        where: { action: 'document_created' }
      });

      expect(auditTrail).toBeDefined();
      expect(auditTrail.user_id).toBe(testUser.id);
    });
  });
});
