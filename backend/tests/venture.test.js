const request = require('supertest');
const path = require('path');

// Import the server
const server = require('../src/server');
const app = server.getApp();

describe('Venture API Tests', () => {
  let authToken;
  let testUser;
  let testVenture;

  beforeAll(async () => {
    // Set individual test timeout
    jest.setTimeout(30000);
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'venture-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'Venture',
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
          email: 'venture-test@alicesolutionsgroup.com',
          password: 'TestPassword123!'
        });
      
      if (loginResponse.status === 200) {
        testUser = loginResponse.body.data.user;
        authToken = loginResponse.body.data.token;
      }
    }
  });

  afterAll(async () => {
    // Cleanup test venture
    if (testVenture) {
      try {
        await request(app)
          .delete(`/api/ventures/${testVenture.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.log('Venture cleanup failed:', error.message);
      }
    }

    // Cleanup test user
    if (testUser) {
      try {
        await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.log('User cleanup failed:', error.message);
      }
    }
  });

  describe('Create Venture', () => {
    test('should create a new venture with valid data', async () => {
      const ventureData = {
        name: 'Test Venture',
        description: 'A test venture for testing purposes',
        problemStatement: 'Testing the venture creation API',
        targetMarket: 'Test Market',
        status: 'idea'
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(ventureData.name);
      expect(response.body.data.description).toBe(ventureData.description);
      expect(response.body.data.problemStatement).toBe(ventureData.problemStatement);
      expect(response.body.data.targetMarket).toBe(ventureData.targetMarket);
      expect(response.body.data.status).toBe(ventureData.status);
      expect(response.body.data.founderId).toBe(testUser.id);

      testVenture = response.body.data;
    });

    test('should require authentication to create venture', async () => {
      const ventureData = {
        name: 'Unauthorized Venture',
        description: 'This should fail'
      };

      const response = await request(app)
        .post('/api/ventures')
        .send(ventureData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Empty data
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('required');
    });

    test('should validate venture name length', async () => {
      const ventureData = {
        name: 'A'.repeat(256), // Too long
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should prevent duplicate venture names for same user', async () => {
      const ventureData = {
        name: 'Test Venture', // Same name as testVenture
        description: 'Another test venture'
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Get Ventures', () => {
    test('should get all ventures for authenticated user', async () => {
      const response = await request(app)
        .get('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should require authentication to get ventures', async () => {
      const response = await request(app)
        .get('/api/ventures')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should get specific venture by ID', async () => {
      const response = await request(app)
        .get(`/api/ventures/${testVenture.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testVenture.id);
      expect(response.body.data.name).toBe(testVenture.name);
    });

    test('should return 404 for non-existent venture', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/ventures/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
    });

    test('should not return ventures from other users', async () => {
      // Create another user
      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'another-user@alicesolutionsgroup.com',
          password: 'TestPassword123!',
          firstName: 'Another',
          lastName: 'User'
        });

      if (anotherUserResponse.status === 201) {
        const anotherUser = anotherUserResponse.body.data.user;
        const anotherToken = anotherUserResponse.body.data.token;

        // Try to access the first user's venture
        const response = await request(app)
          .get(`/api/ventures/${testVenture.id}`)
          .set('Authorization', `Bearer ${anotherToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);

        // Cleanup
        await request(app)
          .delete(`/api/users/${anotherUser.id}`)
          .set('Authorization', `Bearer ${anotherToken}`);
      }
    });
  });

  describe('Update Venture', () => {
    test('should update venture with valid data', async () => {
      const updateData = {
        name: 'Updated Test Venture',
        description: 'Updated description',
        status: 'development'
      };

      const response = await request(app)
        .put(`/api/ventures/${testVenture.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.status).toBe(updateData.status);

      // Update testVenture for subsequent tests
      testVenture = response.body.data;
    });

    test('should require authentication to update venture', async () => {
      const updateData = {
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put(`/api/ventures/${testVenture.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent venture update', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateData = {
        name: 'Non-existent Venture'
      };

      const response = await request(app)
        .put(`/api/ventures/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should validate status enum values', async () => {
      const updateData = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put(`/api/ventures/${testVenture.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should allow partial updates', async () => {
      const updateData = {
        description: 'Partially updated description'
      };

      const response = await request(app)
        .put(`/api/ventures/${testVenture.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(updateData.description);
      // Other fields should remain unchanged
      expect(response.body.data.name).toBe(testVenture.name);
    });
  });

  describe('Delete Venture', () => {
    test('should delete venture successfully', async () => {
      const response = await request(app)
        .delete(`/api/ventures/${testVenture.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Set testVenture to null to prevent cleanup in afterAll
      testVenture = null;
    });

    test('should require authentication to delete venture', async () => {
      const response = await request(app)
        .delete(`/api/ventures/${testVenture.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent venture deletion', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .delete(`/api/ventures/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Venture Validation', () => {
    test('should validate venture name format', async () => {
      const ventureData = {
        name: '', // Empty name
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate description length', async () => {
      const ventureData = {
        name: 'Valid Name',
        description: 'A'.repeat(1001) // Too long
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate target market format', async () => {
      const ventureData = {
        name: 'Valid Name',
        description: 'Valid description',
        targetMarket: 'A'.repeat(256) // Too long
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Venture Security', () => {
    test('should prevent SQL injection in venture name', async () => {
      const ventureData = {
        name: "'; DROP TABLE ventures; --",
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should sanitize HTML in venture description', async () => {
      const ventureData = {
        name: 'Valid Name',
        description: '<script>alert("xss")</script>Valid description'
      };

      const response = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // The description should be sanitized
      expect(response.body.data.description).not.toContain('<script>');
    });

    test('should handle rate limiting for venture creation', async () => {
      const ventureData = {
        name: 'Rate Limit Test',
        description: 'Testing rate limits'
      };

      // Make multiple requests quickly
      const promises = Array(10).fill().map((_, index) =>
        request(app)
          .post('/api/ventures')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...ventureData,
            name: `${ventureData.name} ${index}`
          })
      );

      const responses = await Promise.all(promises);
      
      // At least one should succeed
      const successCount = responses.filter(r => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Venture Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
      expect(response.body.success).toBe(true);
    });

    test('should handle concurrent venture operations', async () => {
      const ventureData = {
        name: 'Concurrent Test Venture',
        description: 'Testing concurrent operations'
      };

      // Create venture
      const createResponse = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .send(ventureData)
        .expect(201);

      const venture = createResponse.body.data;

      // Perform concurrent operations
      const promises = [
        request(app).get(`/api/ventures/${venture.id}`).set('Authorization', `Bearer ${authToken}`),
        request(app).put(`/api/ventures/${venture.id}`).set('Authorization', `Bearer ${authToken}`).send({ description: 'Updated' }),
        request(app).get('/api/ventures').set('Authorization', `Bearer ${authToken}`)
      ];

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Cleanup
      await request(app)
        .delete(`/api/ventures/${venture.id}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });
});
