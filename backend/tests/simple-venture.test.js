/**
 * Simple Venture Test - No Complex Setup
 * Tests the Venture model directly without server startup
 */

const request = require('supertest');

// Mock the database service directly
jest.mock('../src/services/databaseService', () => {
  const mockData = {
    ventures: []
  };

  return {
    Venture: {
      create: jest.fn().mockImplementation((data) => {
        const venture = {
          id: mockData.ventures.length + 1,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockData.ventures.push(venture);
        return Promise.resolve(venture);
      }),
      findByPk: jest.fn().mockImplementation((id) => {
        const venture = mockData.ventures.find(v => v.id === id);
        return Promise.resolve(venture || null);
      }),
      findAll: jest.fn().mockImplementation((options) => {
        let results = [...mockData.ventures];
        if (options && options.where) {
          if (options.where.founderId) {
            results = results.filter(v => v.founderId === options.where.founderId);
          }
        }
        return Promise.resolve(results);
      }),
      findByFounder: jest.fn().mockImplementation((founderId) => {
        const ventures = mockData.ventures.filter(v => v.founderId === founderId);
        return Promise.resolve(ventures);
      }),
      findAndCountAll: jest.fn().mockImplementation((options) => {
        let results = [...mockData.ventures];
        if (options && options.where) {
          if (options.where.founderId) {
            results = results.filter(v => v.founderId === options.where.founderId);
          }
        }
        return Promise.resolve({ rows: results, count: results.length });
      }),
      update: jest.fn().mockImplementation((data, options) => {
        if (options && options.where && options.where.id) {
          const venture = mockData.ventures.find(v => v.id === options.where.id);
          if (venture) {
            Object.assign(venture, data);
            venture.updatedAt = new Date();
            return Promise.resolve([1]);
          }
        }
        return Promise.resolve([0]);
      }),
      destroy: jest.fn().mockImplementation((options) => {
        if (options && options.where && options.where.id) {
          const index = mockData.ventures.findIndex(v => v.id === options.where.id);
          if (index !== -1) {
            mockData.ventures.splice(index, 1);
            return Promise.resolve(1);
          }
        }
        return Promise.resolve(0);
      }),
      count: jest.fn().mockImplementation((options) => {
        let results = mockData.ventures;
        if (options && options.where) {
          if (options.where.founderId) {
            results = results.filter(v => v.founderId === options.where.founderId);
          }
        }
        return Promise.resolve(results.length);
      })
    }
  };
});

// Mock other dependencies
jest.mock('../src/middleware/auth', () => ({
  auth: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: 1, email: 'test@example.com', role: 'user' };
    next();
  })
}));

jest.mock('../src/middleware/errorHandler', () => ({
  asyncHandler: jest.fn().mockImplementation((fn) => fn)
}));

jest.mock('../src/middleware/rateLimiter', () => ({
  ventureRateLimiter: jest.fn().mockImplementation((req, res, next) => next())
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Simple Venture Tests', () => {
  let app;

  beforeAll(async () => {
    // Create a simple Express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());

    // Import and use the venture controller
    const ventureController = require('../src/controllers/ventureController');
    app.use('/api/ventures', ventureController);
  });

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
      .send(ventureData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.name).toBe(ventureData.name);
    expect(response.body.data.description).toBe(ventureData.description);
    expect(response.body.data.problemStatement).toBe(ventureData.problemStatement);
    expect(response.body.data.targetMarket).toBe(ventureData.targetMarket);
    expect(response.body.data.status).toBe(ventureData.status);
  }, 10000);

  test('should get all ventures for authenticated user', async () => {
    const response = await request(app)
      .get('/api/ventures')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
  }, 10000);

  test('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/ventures')
      .send({}) // Empty data
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('required');
  }, 10000);
});
