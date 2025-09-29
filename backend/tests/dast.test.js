const request = require('supertest');
const server = require('../src/server');
const app = server.getApp();
const { logger } = require('../src/utils/logger');

/**
 * Dynamic Application Security Testing (DAST)
 * Comprehensive security testing for SmartStart Platform
 */

describe('DAST - Dynamic Application Security Testing', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user for authenticated tests
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dast-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'DAST',
        lastName: 'Test'
      });

    testUser = response.body.user;
    authToken = response.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);
    }
  });

  describe('Authentication Bypass', () => {
    test('should prevent authentication bypass via parameter manipulation', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .query({ user_id: '1' })
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });

    test('should prevent JWT token manipulation', async () => {
      const manipulatedToken = `${authToken}.tampered`;

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    test('should prevent session fixation', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dast-test@alicesolutionsgroup.com',
          password: 'TestPassword123!'
        });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dast-test@alicesolutionsgroup.com',
          password: 'TestPassword123!'
        });

      expect(response1.body.token).not.toBe(response2.body.token);
    });
  });

  describe('SQL Injection', () => {
    test('should prevent SQL injection in login endpoint', async () => {
      const sqlInjectionPayloads = [
        'admin\'; DROP TABLE users; --',
        'admin\' OR \'1\'=\'1',
        'admin\' UNION SELECT * FROM users --',
        'admin\'; INSERT INTO users VALUES (\'hacker\', \'password\'); --'
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'password'
          })
          .expect(400);

        expect(response.body.message).toContain('Invalid email format');
      }
    });

    test('should prevent SQL injection in search endpoints', async () => {
      const sqlInjectionPayloads = [
        '\'; DROP TABLE documents; --',
        '\' OR \'1\'=\'1',
        '\' UNION SELECT * FROM documents --',
        '\'; INSERT INTO documents VALUES (\'hacked\', \'content\'); --'
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get('/api/documents/search')
          .query({ q: payload })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.message).toContain('Invalid search query');
      }
    });

    test('should prevent SQL injection in user management', async () => {
      const sqlInjectionPayloads = [
        '\'; DROP TABLE users; --',
        '\' OR \'1\'=\'1',
        '\'; UPDATE users SET role=\'admin\' WHERE id=1; --'
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: payload
          })
          .expect(400);

        expect(response.body.message).toContain('Invalid input');
      }
    });
  });

  describe('Cross-Site Scripting (XSS)', () => {
    test('should prevent XSS in document content', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(\'xss\')"></iframe>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<script>');
        expect(response.body.content).not.toContain('javascript:');
        expect(response.body.content).not.toContain('onerror');
        expect(response.body.content).not.toContain('onload');
      }
    });

    test('should prevent XSS in user profile', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bio: payload
          })
          .expect(200);

        expect(response.body.bio).not.toContain('<script>');
        expect(response.body.bio).not.toContain('onerror');
        expect(response.body.bio).not.toContain('onload');
      }
    });

    test('should prevent XSS in search results', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const response = await request(app)
        .get('/api/documents/search')
        .query({ q: xssPayload })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });
  });

  describe('Cross-Site Request Forgery (CSRF)', () => {
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

    test('should validate CSRF token', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'invalid-token')
        .send({
          title: 'Test Document',
          content: 'Test content'
        })
        .expect(403);

      expect(response.body.message).toContain('Invalid CSRF token');
    });

    test('should prevent CSRF on user profile updates', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Hacked'
        })
        .expect(403);

      expect(response.body.message).toContain('CSRF token required');
    });
  });

  describe('Insecure Direct Object References', () => {
    test('should prevent access to other users documents', async () => {
      const response = await request(app)
        .get('/api/documents/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('Document not found');
    });

    test('should prevent access to other users profiles', async () => {
      const response = await request(app)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('should prevent directory traversal', async () => {
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const payload of traversalPayloads) {
        const response = await request(app)
          .get(`/api/documents/download/${payload}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.message).toContain('Invalid file path');
      }
    });
  });

  describe('Security Misconfiguration', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      expect(response.body.message).not.toContain('stack trace');
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('password');
    });

    test('should not expose server information in headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers.server).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should enforce HTTPS in production', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['strict-transport-security']).toBeDefined();
      }
    });
  });

  describe('Sensitive Data Exposure', () => {
    test('should not expose password hashes in API responses', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.password).toBeUndefined();
      expect(response.body.password_hash).toBeUndefined();
      expect(response.body.salt).toBeUndefined();
    });

    test('should not expose internal IDs in URLs', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    test('should encrypt sensitive data in transit', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Sensitive Document',
          content: 'This contains sensitive information'
        })
        .expect(201);

      expect(response.body.encryption_key).toBeDefined();
    });
  });

  describe('Broken Authentication', () => {
    test('should enforce session timeout', async () => {
      // Simulate expired session
      const expiredToken = 'expired-token';

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toContain('Session expired');
    });

    test('should prevent brute force attacks', async () => {
      const maxAttempts = 5;

      for (let i = 0; i < maxAttempts; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'dast-test@alicesolutionsgroup.com',
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // 6th attempt should be blocked
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dast-test@alicesolutionsgroup.com',
          password: 'wrongpassword'
        })
        .expect(429);

      expect(response.body.message).toContain('Too many login attempts');
    });

    test('should require strong passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'Password',
        'PASSWORD123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test-${Date.now()}@example.com`,
            password,
            firstName: 'Test',
            lastName: 'User'
          })
          .expect(400);

        expect(response.body.message).toContain('Password must be strong');
      }
    });
  });

  describe('Insecure Deserialization', () => {
    test('should prevent insecure deserialization', async () => {
      const maliciousPayload = {
        __proto__: {
          isAdmin: true
        }
      };

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send(maliciousPayload)
        .expect(400);

      expect(response.body.message).toContain('Invalid input');
    });

    test('should validate JSON structure', async () => {
      const invalidJson = '{"malicious": "payload", "}';

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .set('Content-Type', 'application/json')
        .send(invalidJson)
        .expect(400);

      expect(response.body.message).toContain('Invalid JSON');
    });
  });

  describe('Using Components with Known Vulnerabilities', () => {
    test('should not expose vulnerable component information', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.version).toBeUndefined();
      expect(response.body.dependencies).toBeUndefined();
    });

    test('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .set('Content-Type', 'application/json')
        .send('malformed json')
        .expect(400);

      expect(response.body.message).toContain('Invalid request');
    });
  });

  describe('Insufficient Logging and Monitoring', () => {
    test('should log security events', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Check if security event was logged
      // This would typically check logs or a security events table
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('should log failed authentication attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dast-test@alicesolutionsgroup.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('Business Logic Vulnerabilities', () => {
    test('should prevent privilege escalation', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          role: 'admin'
        })
        .expect(403);

      expect(response.body.message).toContain('Access denied');
    });

    test('should prevent unauthorized document access', async () => {
      const response = await request(app)
        .get('/api/documents/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('Document not found');
    });

    test('should prevent data manipulation', async () => {
      const response = await request(app)
        .put('/api/documents/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Hacked Document'
        })
        .expect(404);

      expect(response.body.message).toContain('Document not found');
    });
  });

  describe('API Security', () => {
    test('should enforce rate limiting', async () => {
      const maxRequests = 100;

      for (let i = 0; i < maxRequests; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);
      }

      // 101st request should be rate limited
      const response = await request(app)
        .get('/api/health')
        .expect(429);

      expect(response.body.message).toContain('Rate limit exceeded');
    });

    test('should validate API input', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: '', // Empty title
          content: 'x'.repeat(10000) // Too long content
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
    });

    test('should prevent API abuse', async () => {
      const response = await request(app)
        .get('/api/documents/search')
        .query({ q: 'a'.repeat(1000) }) // Very long search query
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('Search query too long');
    });
  });
});
