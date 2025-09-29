const request = require('supertest');
const server = require('../src/server');
const app = server.getApp();
const {
  User, Document, Signature, AuditTrail
} = require('../src/services/databaseService');
const SecurityManager = require('../src/database/security');

/**
 * Integration Tests for SmartStart Platform
 * Comprehensive testing of all system components working together
 */

describe('Integration Tests', () => {
  let testUser;
  let authToken;
  let securityManager;

  beforeAll(async () => {
    // Skip SecurityManager initialization for now
    // securityManager = new SecurityManager();

    // Create test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'integration-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'Integration',
        lastName: 'Test'
      });

    testUser = response.body.user;
    authToken = response.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser) {
      await User.destroy({ where: { id: testUser.id } });
    }
  });

  describe('User Registration and Authentication Flow', () => {
    test('should complete full user registration flow', async () => {
      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'flow-test@alicesolutionsgroup.com',
          password: 'TestPassword123!',
          firstName: 'Flow',
          lastName: 'Test'
        })
        .expect(201);

      expect(registerResponse.body.data.user).toBeDefined();
      expect(registerResponse.body.data.token).toBeDefined();

      // Step 2: Verify email (simulated)
      const verifyResponse = await request(app)
        .post('/api/auth/verify-email')
        .send({
          token: registerResponse.body.data.verificationToken
        })
        .expect(200);

      expect(verifyResponse.body.message).toContain('Email verified');

      // Step 3: Login with verified account
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'flow-test@alicesolutionsgroup.com',
          password: 'TestPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.data.user).toBeDefined();
      expect(loginResponse.body.data.token).toBeDefined();

      // Cleanup
      await User.destroy({ where: { id: registerResponse.body.data.user.id } });
    });

    test('should handle password reset flow', async () => {
      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/request-password-reset')
        .send({
          email: 'integration-test@alicesolutionsgroup.com'
        })
        .expect(200);

      expect(resetRequestResponse.body.message).toContain('Password reset email sent');

      // Step 2: Reset password with token
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      expect(resetResponse.body.message).toContain('Password reset successfully');

      // Step 3: Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration-test@alicesolutionsgroup.com',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.user).toBeDefined();
    });
  });

  describe('Document Management Flow', () => {
    let documentId;

    test('should complete full document lifecycle', async () => {
      // Step 1: Create document
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Integration Test Document',
          content: 'This is a test document for integration testing',
          documentType: 'nda'
        })
        .expect(201);

      expect(createResponse.body.document).toBeDefined();
      documentId = createResponse.body.document.id;

      // Step 2: Get document
      const getResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.document.title).toBe('Integration Test Document');

      // Step 3: Update document
      const updateResponse = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Updated Integration Test Document',
          content: 'This is an updated test document'
        })
        .expect(200);

      expect(updateResponse.body.document.title).toBe('Updated Integration Test Document');

      // Step 4: Sign document
      const signResponse = await request(app)
        .post(`/api/documents/${documentId}/sign`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          signatureData: 'digital-signature-data'
        })
        .expect(200);

      expect(signResponse.body.signature).toBeDefined();

      // Step 5: Get document with signature
      const signedDocResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(signedDocResponse.body.document.status).toBe('signed');
      expect(signedDocResponse.body.document.signatures).toHaveLength(1);

      // Step 6: Archive document
      const archiveResponse = await request(app)
        .put(`/api/documents/${documentId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .expect(200);

      expect(archiveResponse.body.document.status).toBe('archived');
    });

    test('should handle document sharing and collaboration', async () => {
      // Create second user for collaboration
      const collaboratorResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'collaborator@alicesolutionsgroup.com',
          password: 'TestPassword123!',
          firstName: 'Collaborator',
          lastName: 'User'
        })
        .expect(201);

      const collaborator = collaboratorResponse.body.user;
      const collaboratorToken = collaboratorResponse.body.token;

      // Create document
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Collaboration Test Document',
          content: 'This document is for collaboration testing',
          documentType: 'contributor_agreement'
        })
        .expect(201);

      const documentId = createResponse.body.document.id;

      // Share document with collaborator
      const shareResponse = await request(app)
        .post(`/api/documents/${documentId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          userId: collaborator.id,
          permission: 'read'
        })
        .expect(200);

      expect(shareResponse.body.message).toContain('Document shared successfully');

      // Collaborator should be able to access document
      const accessResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .expect(200);

      expect(accessResponse.body.document.title).toBe('Collaboration Test Document');

      // Collaborator should not be able to edit document
      const editResponse = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Unauthorized Edit'
        })
        .expect(403);

      expect(editResponse.body.message).toContain('Insufficient permissions');

      // Cleanup
      await User.destroy({ where: { id: collaborator.id } });
    });
  });

  describe('Venture Management Flow', () => {
    let ventureId;

    test('should complete full venture lifecycle', async () => {
      // Step 1: Create venture
      const createResponse = await request(app)
        .post('/api/ventures')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          name: 'Integration Test Venture',
          description: 'A test venture for integration testing',
          problemStatement: 'Testing the venture creation process',
          targetMarket: 'Developers and testers'
        })
        .expect(201);

      expect(createResponse.body.venture).toBeDefined();
      ventureId = createResponse.body.venture.id;

      // Step 2: Get venture
      const getResponse = await request(app)
        .get(`/api/ventures/${ventureId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.venture.name).toBe('Integration Test Venture');

      // Step 3: Update venture stage
      const updateResponse = await request(app)
        .put(`/api/ventures/${ventureId}/stage`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          stage: 'sprint_0'
        })
        .expect(200);

      expect(updateResponse.body.venture.stage).toBe('sprint_0');

      // Step 4: Add team member
      const addMemberResponse = await request(app)
        .post(`/api/ventures/${ventureId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          userId: testUser.id,
          role: 'developer',
          equityPercentage: 10
        })
        .expect(200);

      expect(addMemberResponse.body.member).toBeDefined();

      // Step 5: Get venture with team
      const teamResponse = await request(app)
        .get(`/api/ventures/${ventureId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(teamResponse.body.venture.teamMembers).toHaveLength(1);

      // Step 6: Update venture status
      const statusResponse = await request(app)
        .put(`/api/ventures/${ventureId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          status: 'development'
        })
        .expect(200);

      expect(statusResponse.body.venture.status).toBe('development');
    });
  });

  describe('User Journey Tracking Flow', () => {
    test('should track user journey progression', async () => {
      // Step 1: Start journey
      const startResponse = await request(app)
        .post('/api/journey/start')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          stage: 'discovery'
        })
        .expect(200);

      expect(startResponse.body.journey).toBeDefined();

      // Step 2: Update journey progress
      const progressResponse = await request(app)
        .put('/api/journey/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          stage: 'discovery',
          progress: 50,
          data: { step: 2, completed: ['step1'] }
        })
        .expect(200);

      expect(progressResponse.body.journey.progress).toBe(50);

      // Step 3: Complete milestone
      const milestoneResponse = await request(app)
        .post('/api/journey/milestones')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          milestoneType: 'problem_validation',
          title: 'Problem Statement Validated',
          description: 'Successfully validated the problem statement'
        })
        .expect(200);

      expect(milestoneResponse.body.milestone).toBeDefined();

      // Step 4: Get journey summary
      const summaryResponse = await request(app)
        .get('/api/journey/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(summaryResponse.body.journey).toBeDefined();
      expect(summaryResponse.body.milestones).toHaveLength(1);
    });
  });

  describe('Security Integration Flow', () => {
    test('should handle security events and audit trails', async () => {
      // Step 1: Attempt failed login
      const failedLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration-test@alicesolutionsgroup.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(failedLoginResponse.body.message).toContain('Invalid credentials');

      // Step 2: Check security event was logged
      const securityEventsResponse = await request(app)
        .get('/api/security/events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(securityEventsResponse.body.events).toBeDefined();
      expect(securityEventsResponse.body.events.length).toBeGreaterThan(0);

      // Step 3: Check audit trail
      const auditTrailResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(auditTrailResponse.body.auditTrails).toBeDefined();
      expect(auditTrailResponse.body.auditTrails.length).toBeGreaterThan(0);
    });

    test('should handle rate limiting and blocking', async () => {
      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);
      }

      // 11th request should be rate limited
      const rateLimitResponse = await request(app)
        .get('/api/health')
        .expect(429);

      expect(rateLimitResponse.body.message).toContain('Rate limit exceeded');
    });
  });

  describe('Data Encryption and Security Flow', () => {
    test('should encrypt sensitive data end-to-end', async () => {
      // Step 1: Create document with sensitive content
      const createResponse = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Sensitive Document',
          content: 'This document contains sensitive information that should be encrypted',
          documentType: 'nda'
        })
        .expect(201);

      const documentId = createResponse.body.document.id;

      // Step 2: Verify document is encrypted in database
      const document = await Document.findByPk(documentId);
      expect(document.encryptionKey).toBeDefined();
      expect(document.content).not.toContain('sensitive information');

      // Step 3: Retrieve document and verify decryption
      const getResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.document.content).toContain('sensitive information');
    });

    test('should handle secure file uploads', async () => {
      // Step 1: Upload file
      const uploadResponse = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .attach('file', Buffer.from('test file content'), 'test.txt')
        .expect(200);

      expect(uploadResponse.body.file).toBeDefined();
      expect(uploadResponse.body.file.hash).toBeDefined();

      // Step 2: Verify file integrity
      const verifyResponse = await request(app)
        .post('/api/documents/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          fileId: uploadResponse.body.file.id,
          hash: uploadResponse.body.file.hash
        })
        .expect(200);

      expect(verifyResponse.body.verified).toBe(true);
    });
  });

  describe('API Integration Flow', () => {
    test('should handle API key authentication', async () => {
      // Step 1: Generate API key
      const apiKeyResponse = await request(app)
        .post('/api/users/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          name: 'Integration Test API Key',
          permissions: ['read:documents', 'write:documents']
        })
        .expect(200);

      const { apiKey } = apiKeyResponse.body;

      // Step 2: Use API key for authentication
      const apiResponse = await request(app)
        .get('/api/documents')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(apiResponse.body.documents).toBeDefined();

      // Step 3: Revoke API key
      const revokeResponse = await request(app)
        .delete(`/api/users/api-keys/${apiKeyResponse.body.apiKey.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .expect(200);

      expect(revokeResponse.body.message).toContain('API key revoked');
    });
  });

  describe('Error Handling and Recovery Flow', () => {
    test('should handle database connection failures gracefully', async () => {
      // Simulate database connection failure
      const originalQuery = require('../src/services/databaseService').sequelize.query;
      require('../src/services/databaseService').sequelize.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.message).toContain('Service unavailable');

      // Restore original query function
      require('../src/services/databaseService').sequelize.query = originalQuery;
    });

    test('should handle authentication failures gracefully', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('Invalid token');
    });

    test('should handle validation errors gracefully', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: '', // Invalid: empty title
          content: 'x'.repeat(10000) // Invalid: too long
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Performance and Scalability Flow', () => {
    test('should handle concurrent requests', async () => {
      const promises = [];

      // Create 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle large document uploads', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB content

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

      expect(response.body.document).toBeDefined();
      expect(response.body.document.content).toHaveLength(1000000);
    });
  });
});
