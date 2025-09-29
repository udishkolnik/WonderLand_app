const request = require('supertest');
const path = require('path');

// Import the server
const server = require('../src/server');
const app = server.getApp();

describe('Dashboard API Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Set individual test timeout
    jest.setTimeout(30000);
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'dashboard-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'Dashboard',
        lastName: 'Test'
      });

    if (registerResponse.status === 201) {
      testUser = registerResponse.body.data.user;
      authToken = registerResponse.body.data.token;
    } else {
      // Try to login if user already exists
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dashboard-test@alicesolutionsgroup.com',
          password: 'TestPassword123!'
        });
      
      if (loginResponse.status === 200) {
        testUser = loginResponse.body.data.user;
        authToken = loginResponse.body.data.token;
      }
    }
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUser) {
      try {
        await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.log('Cleanup failed:', error.message);
      }
    }
  });

  describe('Dashboard Stats', () => {
    test('should get dashboard statistics for authenticated user', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.ventures).toBeDefined();
      expect(response.body.data.documents).toBeDefined();
      expect(response.body.data.signatures).toBeDefined();
      expect(response.body.data.activity).toBeDefined();
    });

    test('should require authentication for dashboard stats', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Dashboard Ventures', () => {
    test('should get user ventures with pagination', async () => {
      const response = await request(app)
        .get('/api/dashboard/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ventures).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    test('should filter ventures by status', async () => {
      const response = await request(app)
        .get('/api/dashboard/ventures?status=idea')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ventures).toBeDefined();
    });

    test('should filter ventures by stage', async () => {
      const response = await request(app)
        .get('/api/dashboard/ventures?stage=discovery')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ventures).toBeDefined();
    });
  });

  describe('Dashboard Activity', () => {
    test('should get recent user activity', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.auditTrail).toBeDefined();
      expect(response.body.data.ventures).toBeDefined();
      expect(response.body.data.documents).toBeDefined();
    });

    test('should limit activity results', async () => {
      const response = await request(app)
        .get('/api/dashboard/activity?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.auditTrail.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Dashboard Journey', () => {
    test('should get user journey progress', async () => {
      const response = await request(app)
        .get('/api/dashboard/journey')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.overall).toBeDefined();
      expect(response.body.data.overall.totalStages).toBe(7);
      expect(response.body.data.overall.percentage).toBeGreaterThanOrEqual(0);
      expect(response.body.data.overall.percentage).toBeLessThanOrEqual(100);
    });

    test('should include all journey stages', async () => {
      const response = await request(app)
        .get('/api/dashboard/journey')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stages = response.body.data.progress.map(p => p.stage);
      const expectedStages = [
        'discovery',
        'problem_statement',
        'sprint_0',
        'mvp_build',
        'beta_test',
        'decision_gate',
        'launch'
      ];

      expectedStages.forEach(stage => {
        expect(stages).toContain(stage);
      });
    });
  });

  describe('Admin Dashboard', () => {
    test('should require admin role for admin dashboard', async () => {
      const response = await request(app)
        .get('/api/dashboard/admin')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Access denied');
    });
  });

  describe('Dashboard Error Handling', () => {
    test('should handle invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing authentication header', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle rate limiting', async () => {
      // Make multiple requests quickly to test rate limiting
      const promises = Array(10).fill().map(() =>
        request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // At least one should succeed
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Data Integrity', () => {
    test('should return consistent data structure', async () => {
      const [statsResponse, venturesResponse, activityResponse, journeyResponse] = await Promise.all([
        request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/dashboard/ventures').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/dashboard/activity').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/dashboard/journey').set('Authorization', `Bearer ${authToken}`)
      ]);

      // All responses should be successful
      expect(statsResponse.status).toBe(200);
      expect(venturesResponse.status).toBe(200);
      expect(activityResponse.status).toBe(200);
      expect(journeyResponse.status).toBe(200);

      // All should have success: true
      expect(statsResponse.body.success).toBe(true);
      expect(venturesResponse.body.success).toBe(true);
      expect(activityResponse.body.success).toBe(true);
      expect(journeyResponse.body.success).toBe(true);

      // All should have timestamp
      expect(statsResponse.body.timestamp).toBeDefined();
      expect(venturesResponse.body.timestamp).toBeDefined();
      expect(activityResponse.body.timestamp).toBeDefined();
      expect(journeyResponse.body.timestamp).toBeDefined();
    });

    test('should handle empty data gracefully', async () => {
      const response = await request(app)
        .get('/api/dashboard/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ventures).toBeDefined();
      expect(Array.isArray(response.body.data.ventures)).toBe(true);
      expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Dashboard Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      expect(response.body.success).toBe(true);
    });

    test('should handle concurrent requests', async () => {
      const promises = Array(5).fill().map(() =>
        request(app)
          .get('/api/dashboard/stats')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
