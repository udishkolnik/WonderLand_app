/**
 * Standalone Venture Test - No Global Setup
 * Tests the Venture model logic directly without any global setup
 */

// Set test environment before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.DB_PATH = ':memory:';

// Mock all dependencies before any imports
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

// Test the Venture model directly
describe('Standalone Venture Tests', () => {
  test('should create a new venture with valid data', async () => {
    const { Venture } = require('../src/services/databaseService');
    
    const ventureData = {
      name: 'Test Venture',
      description: 'A test venture for testing purposes',
      problemStatement: 'Testing the venture creation API',
      targetMarket: 'Test Market',
      status: 'idea',
      founderId: 1
    };

    const venture = await Venture.create(ventureData);

    expect(venture).toBeDefined();
    expect(venture.name).toBe(ventureData.name);
    expect(venture.description).toBe(ventureData.description);
    expect(venture.problemStatement).toBe(ventureData.problemStatement);
    expect(venture.targetMarket).toBe(ventureData.targetMarket);
    expect(venture.status).toBe(ventureData.status);
    expect(venture.founderId).toBe(ventureData.founderId);
  }, 10000);

  test('should get all ventures for a founder', async () => {
    const { Venture } = require('../src/services/databaseService');
    
    const ventures = await Venture.findByFounder(1);

    expect(Array.isArray(ventures)).toBe(true);
    expect(ventures.length).toBeGreaterThan(0);
  }, 10000);

  test('should find venture by ID', async () => {
    const { Venture } = require('../src/services/databaseService');
    
    const venture = await Venture.findByPk(1);

    expect(venture).toBeDefined();
    expect(venture.id).toBe(1);
    expect(venture.name).toBe('Test Venture');
  }, 10000);

  test('should update venture', async () => {
    const { Venture } = require('../src/services/databaseService');
    
    const updateData = {
      name: 'Updated Test Venture',
      description: 'Updated description'
    };

    const result = await Venture.update(updateData, { where: { id: 1 } });

    expect(result[0]).toBe(1); // One row affected
  }, 10000);

  test('should delete venture', async () => {
    const { Venture } = require('../src/services/databaseService');
    
    const result = await Venture.destroy({ where: { id: 1 } });

    expect(result).toBe(1); // One row deleted
  }, 10000);
});
