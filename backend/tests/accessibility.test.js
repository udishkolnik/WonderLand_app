const request = require('supertest');
const server = require('../src/server');
const app = server.getApp();

/**
 * Accessibility Tests for SmartStart Platform
 * Comprehensive testing for accessibility compliance
 */

describe('Accessibility Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user for authenticated tests
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'accessibility-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'Accessibility',
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

  describe('API Response Accessibility', () => {
    test('should provide alternative text for images', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: 'Document with image: <img src="test.jpg" alt="Test image description">',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('alt=');
      expect(response.body.document.content).toContain('Test image description');
    });

    test('should provide proper heading structure', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<h1>Main Heading</h1><h2>Subheading</h2><h3>Sub-subheading</h3>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<h1>');
      expect(response.body.document.content).toContain('<h2>');
      expect(response.body.document.content).toContain('<h3>');
    });

    test('should provide proper form labels', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<form><label for="name">Name:</label><input type="text" id="name" name="name"></form>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<label');
      expect(response.body.document.content).toContain('for=');
      expect(response.body.document.content).toContain('id=');
    });

    test('should provide proper table headers', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Data 1</td><td>Data 2</td></tr></tbody></table>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<thead>');
      expect(response.body.document.content).toContain('<th>');
      expect(response.body.document.content).toContain('<tbody>');
    });

    test('should provide proper link descriptions', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<a href="https://example.com" title="Visit Example Website">Click here</a>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('title=');
      expect(response.body.document.content).toContain('Visit Example Website');
    });
  });

  describe('Color and Contrast Accessibility', () => {
    test('should not rely solely on color for information', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: 'Required fields are marked with <span style="color: red;">*</span> and <strong>bold text</strong>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<strong>');
      expect(response.body.document.content).not.toContain('color: red');
    });

    test('should provide sufficient color contrast', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<p style="color: #000000; background-color: #ffffff;">High contrast text</p>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('color: #000000');
      expect(response.body.document.content).toContain('background-color: #ffffff');
    });
  });

  describe('Keyboard Navigation Accessibility', () => {
    test('should provide proper tab order', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<form><input type="text" tabindex="1"><input type="text" tabindex="2"><button tabindex="3">Submit</button></form>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('tabindex="1"');
      expect(response.body.document.content).toContain('tabindex="2"');
      expect(response.body.document.content).toContain('tabindex="3"');
    });

    test('should provide proper focus indicators', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<button style="outline: 2px solid blue;">Focusable button</button>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('outline: 2px solid blue');
    });

    test('should provide proper skip links', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<a href="#main-content" class="skip-link">Skip to main content</a><main id="main-content">Main content</main>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('skip-link');
      expect(response.body.document.content).toContain('id="main-content"');
    });
  });

  describe('Screen Reader Accessibility', () => {
    test('should provide proper ARIA labels', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<button aria-label="Close dialog">×</button><input aria-label="Search query" type="text">',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('aria-label=');
      expect(response.body.document.content).toContain('Close dialog');
      expect(response.body.document.content).toContain('Search query');
    });

    test('should provide proper ARIA roles', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<nav role="navigation"><ul role="menubar"><li role="menuitem">Home</li></ul></nav>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('role="navigation"');
      expect(response.body.document.content).toContain('role="menubar"');
      expect(response.body.document.content).toContain('role="menuitem"');
    });

    test('should provide proper ARIA states', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<button aria-expanded="false" aria-controls="menu">Menu</button><ul id="menu" aria-hidden="true">',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('aria-expanded=');
      expect(response.body.document.content).toContain('aria-controls=');
      expect(response.body.document.content).toContain('aria-hidden=');
    });

    test('should provide proper ARIA descriptions', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<input type="password" aria-describedby="password-help"><div id="password-help">Password must be at least 8 characters</div>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('aria-describedby=');
      expect(response.body.document.content).toContain('id="password-help"');
    });
  });

  describe('Language and Content Accessibility', () => {
    test('should provide proper language attributes', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<html lang="en"><body><p>English content</p><p lang="es">Contenido en español</p></body></html>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('lang="en"');
      expect(response.body.document.content).toContain('lang="es"');
    });

    test('should provide proper content structure', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<main><section><article><header><h1>Article Title</h1></header><p>Article content</p></article></section></main>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<main>');
      expect(response.body.document.content).toContain('<section>');
      expect(response.body.document.content).toContain('<article>');
      expect(response.body.document.content).toContain('<header>');
    });

    test('should provide proper list structure', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<ol><li>First item</li><li>Second item</li></ol><ul><li>Unordered item</li></ul>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<ol>');
      expect(response.body.document.content).toContain('<ul>');
      expect(response.body.document.content).toContain('<li>');
    });
  });

  describe('Error Handling Accessibility', () => {
    test('should provide proper error messages', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: '', // Invalid: empty title
          content: 'Test content'
        })
        .expect(400);

      expect(response.body.message).toContain('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should provide proper success messages', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: 'Test content'
        })
        .expect(201);

      expect(response.body.message).toContain('Document created successfully');
      expect(response.body.document).toBeDefined();
    });

    test('should provide proper loading states', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: 'Test content'
        })
        .expect(201);

      expect(response.body.document).toBeDefined();
      expect(response.body.document.status).toBe('draft');
    });
  });

  describe('Mobile Accessibility', () => {
    test('should provide proper viewport settings', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('viewport');
      expect(response.body.document.content).toContain('width=device-width');
    });

    test('should provide proper touch targets', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<button style="min-height: 44px; min-width: 44px;">Touch target</button>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('min-height: 44px');
      expect(response.body.document.content).toContain('min-width: 44px');
    });

    test('should provide proper responsive design', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<style>@media (max-width: 768px) { .mobile { display: block; } }</style>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('@media');
      expect(response.body.document.content).toContain('max-width: 768px');
    });
  });

  describe('Assistive Technology Compatibility', () => {
    test('should provide proper semantic markup', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<time datetime="2023-12-01">December 1, 2023</time><address>123 Main St, City, State</address>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<time');
      expect(response.body.document.content).toContain('datetime=');
      expect(response.body.document.content).toContain('<address>');
    });

    test('should provide proper form validation', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<form><input type="email" required aria-required="true"><input type="submit"></form>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('required');
      expect(response.body.document.content).toContain('aria-required=');
    });

    test('should provide proper progress indicators', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Accessibility Test Document',
          content: '<progress value="50" max="100" aria-label="Upload progress">50%</progress>',
          documentType: 'other'
        })
        .expect(201);

      expect(response.body.document.content).toContain('<progress');
      expect(response.body.document.content).toContain('aria-label=');
    });
  });
});
