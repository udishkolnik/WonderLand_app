const request = require('supertest');
const { performance } = require('perf_hooks');
const server = require('../src/server');
const app = server.getApp();

/**
 * Performance Tests for SmartStart Platform
 * Comprehensive performance and load testing
 */

describe('Performance Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user for authenticated tests
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'performance-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'Performance',
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

  describe('Response Time Tests', () => {
    test('health endpoint should respond within 100ms', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(100);
      expect(response.body.status).toBe('healthy');
    });

    test('authentication endpoints should respond within 500ms', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'performance-test@alicesolutionsgroup.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500);
      expect(response.body.user).toBeDefined();
    });

    test('document creation should respond within 1000ms', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Performance Test Document',
          content: 'This is a test document for performance testing',
          documentType: 'nda'
        })
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.document).toBeDefined();
    });

    test('document retrieval should respond within 200ms', async () => {
      // First create a document
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Performance Test Document 2',
          content: 'This is another test document for performance testing',
          documentType: 'contributor_agreement'
        })
        .expect(201);

      const documentId = createResponse.body.document.id;

      // Then test retrieval performance
      const startTime = performance.now();

      const response = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(response.body.document).toBeDefined();
    });

    test('user profile update should respond within 300ms', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'Updated bio for performance testing'
        })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(300);
      expect(response.body.user).toBeDefined();
    });
  });

  describe('Concurrent Request Tests', () => {
    test('should handle 10 concurrent health checks', async () => {
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(1000);
    });

    test('should handle 5 concurrent document creations', async () => {
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/documents')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', 'valid-csrf-token')
            .send({
              title: `Concurrent Test Document ${i}`,
              content: `This is concurrent test document ${i}`,
              documentType: 'other'
            })
            .expect(201)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.document.title).toBe(`Concurrent Test Document ${index}`);
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(2000);
    });

    test('should handle 20 concurrent authentication requests', async () => {
      const promises = [];
      const startTime = performance.now();

      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'performance-test@alicesolutionsgroup.com',
              password: 'TestPassword123!'
            })
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.user).toBeDefined();
      });

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should not leak memory during document operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple document operations
      for (let i = 0; i < 50; i++) {
        await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: `Memory Test Document ${i}`,
            content: `This is memory test document ${i}`,
            documentType: 'other'
          })
          .expect(201);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('should handle large document content efficiently', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB content
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Large Document',
          content: largeContent,
          documentType: 'other'
        })
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
      expect(response.body.document).toBeDefined();
      expect(response.body.document.content).toHaveLength(1000000);
    });
  });

  describe('Database Performance Tests', () => {
    test('should handle complex queries efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/documents/')
        .query({ search: 'test', limit: 100, page: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(500);
      expect(response.body.documents).toBeDefined();
    });

    test('should handle pagination efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/documents')
        .query({ page: 1, limit: 50 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(300);
      expect(response.body.documents).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    test('should handle bulk operations efficiently', async () => {
      const startTime = performance.now();

      // Create multiple documents in sequence
      const documentIds = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: `Bulk Test Document ${i}`,
            content: `This is bulk test document ${i}`,
            documentType: 'other'
          })
          .expect(201);

        documentIds.push(response.body.document.id);
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000);
      expect(documentIds).toHaveLength(10);
    });
  });

  describe('File Upload Performance Tests', () => {
    test('should handle file uploads efficiently', async () => {
      const fileContent = Buffer.from('x'.repeat(100000)); // 100KB file
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .attach('file', fileContent, 'test.txt')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.file).toBeDefined();
      expect(response.body.file.size).toBe(100000);
    });

    test('should handle multiple file uploads efficiently', async () => {
      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < 5; i++) {
        const fileContent = Buffer.from(`File content ${i}`.repeat(1000));
        promises.push(
          request(app)
            .post('/api/documents/upload')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-CSRF-Token', 'valid-csrf-token')
            .attach('file', fileContent, `test${i}.txt`)
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000);
      responses.forEach((response) => {
        expect(response.body.file).toBeDefined();
      });
    });
  });

  describe('API Rate Limiting Performance', () => {
    test('should handle rate limiting efficiently', async () => {
      const startTime = performance.now();

      // Make requests up to the rate limit
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable
      expect(responseTime).toBeLessThan(2000);
    });

    test('should handle rate limit exceeded efficiently', async () => {
      // Make requests beyond the rate limit
      const promises = [];
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app)
            .get('/api/health')
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Rate limited responses should be fast
      rateLimitedResponses.forEach((response) => {
        expect(response.body.message).toContain('Rate limit exceeded');
      });
    });
  });

  describe('Security Performance Tests', () => {
    test('should handle encryption/decryption efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Encryption Test Document',
          content: 'This document contains sensitive information that needs encryption',
          documentType: 'nda'
        })
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.document).toBeDefined();
      expect(response.body.document.encryptionKey).toBeDefined();
    });

    test('should handle password hashing efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `password-test-${Date.now()}@alicesolutionsgroup.com`,
          password: 'TestPassword123!',
          firstName: 'Password',
          lastName: 'Test'
        })
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000);
      expect(response.body.user).toBeDefined();

      // Cleanup
      await request(app)
        .delete('/api/users/profile')
        .set('Authorization', `Bearer ${response.body.token}`);
    });
  });

  describe('Load Testing', () => {
    test('should handle sustained load', async () => {
      const startTime = performance.now();
      const promises = [];

      // Create sustained load for 30 seconds
      const loadDuration = 30000; // 30 seconds
      const requestInterval = 100; // 100ms between requests

      const loadTest = setInterval(() => {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }, requestInterval);

      // Stop after load duration
      setTimeout(() => {
        clearInterval(loadTest);
      }, loadDuration);

      // Wait for load test to complete
      await new Promise((resolve) => setTimeout(resolve, loadDuration + 1000));

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Most requests should succeed
      const successfulRequests = responses.filter((r) => r.status === 200);
      expect(successfulRequests.length).toBeGreaterThan(responses.length * 0.95);

      // Average response time should be reasonable
      const averageResponseTime = totalTime / responses.length;
      expect(averageResponseTime).toBeLessThan(200);
    });
  });
});
