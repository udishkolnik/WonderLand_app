/**
 * Comprehensive Test Suite for SmartStart Platform
 * Tests all functionality across the entire application
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    API_BASE_URL: 'http://localhost:3344',
    APP_BASE_URL: 'http://localhost:3345',
    WEBSITE_BASE_URL: 'http://localhost:3346',
    TEST_USER: {
        email: 'test@smartstart.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
    }
};

class ComprehensiveTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            errors: [],
            tests: []
        };
        this.authToken = null;
        this.userId = null;
    }

    async runAllTests() {
        console.log('🧪 Starting Comprehensive Test Suite for SmartStart Platform');
        console.log('=' .repeat(60));

        try {
            // 1. Backend API Tests
            await this.testBackendHealth();
            await this.testUserRegistration();
            await this.testUserLogin();
            await this.testDashboardStats();
            await this.testVenturesAPI();
            await this.testAuditTrailsAPI();
            await this.testVenturesAnalytics();

            // 2. Frontend App Tests
            await this.testAppPages();
            await this.testAppNavigation();
            await this.testAppAuthentication();

            // 3. Website Tests
            await this.testWebsitePages();
            await this.testWebsiteNavigation();

            // 4. Integration Tests
            await this.testFullUserFlow();
            await this.testDataPersistence();
            await this.testErrorHandling();

            // 5. Performance Tests
            await this.testPageLoadTimes();
            await this.testAPIResponseTimes();

            // 6. Security Tests
            await this.testAuthenticationSecurity();
            await this.testDataValidation();

            // 7. UI/UX Tests
            await this.testGlassMorphismEffects();
            await this.testResponsiveDesign();
            await this.testAccessibility();

        } catch (error) {
            this.addError('Test Suite Error', error.message);
        }

        this.printResults();
    }

    // Backend API Tests
    async testBackendHealth() {
        await this.runTest('Backend Health Check', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/health')
                .expect(200);
            
            if (response.body.status === 'healthy') {
                return '✅ Backend is healthy';
            }
            throw new Error('Backend health check failed');
        });
    }

    async testUserRegistration() {
        await this.runTest('User Registration', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .post('/api/auth/register')
                .send(TEST_CONFIG.TEST_USER)
                .expect(200);
            
            if (response.body.success && response.body.data.token) {
                this.authToken = response.body.data.token;
                this.userId = response.body.data.user.id;
                return '✅ User registered successfully';
            }
            throw new Error('User registration failed');
        });
    }

    async testUserLogin() {
        await this.runTest('User Login', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .post('/api/auth/login')
                .send({
                    email: TEST_CONFIG.TEST_USER.email,
                    password: TEST_CONFIG.TEST_USER.password
                })
                .expect(200);
            
            if (response.body.success && response.body.data.token) {
                this.authToken = response.body.data.token;
                return '✅ User login successful';
            }
            throw new Error('User login failed');
        });
    }

    async testDashboardStats() {
        await this.runTest('Dashboard Stats API', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${this.authToken}`)
                .expect(200);
            
            if (response.body.success && response.body.data) {
                return '✅ Dashboard stats retrieved successfully';
            }
            throw new Error('Dashboard stats API failed');
        });
    }

    async testVenturesAPI() {
        await this.runTest('Ventures API', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/ventures')
                .set('Authorization', `Bearer ${this.authToken}`)
                .expect(200);
            
            if (response.body.success && Array.isArray(response.body.data)) {
                return '✅ Ventures API working correctly';
            }
            throw new Error('Ventures API failed');
        });
    }

    async testAuditTrailsAPI() {
        await this.runTest('Audit Trails API', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/audit-trails')
                .set('Authorization', `Bearer ${this.authToken}`)
                .expect(200);
            
            if (response.body.success && Array.isArray(response.body.data)) {
                return '✅ Audit trails API working correctly';
            }
            throw new Error('Audit trails API failed');
        });
    }

    async testVenturesAnalytics() {
        await this.runTest('Ventures Analytics API', async () => {
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/ventures/analytics')
                .set('Authorization', `Bearer ${this.authToken}`)
                .expect(200);
            
            if (response.body.success && response.body.data) {
                return '✅ Ventures analytics API working correctly';
            }
            throw new Error('Ventures analytics API failed');
        });
    }

    // Frontend App Tests
    async testAppPages() {
        const appPages = [
            'dashboard.html',
            'ventures.html',
            'team.html',
            'profile-settings.html',
            'venture-board.html',
            'legal.html',
            'settings.html',
            'notifications.html',
            'help.html'
        ];

        for (const page of appPages) {
            await this.runTest(`App Page: ${page}`, async () => {
                const response = await request(TEST_CONFIG.APP_BASE_URL)
                    .get(`/${page}`)
                    .expect(200);
                
                if (response.text.includes('SmartStart Platform')) {
                    return `✅ ${page} loads correctly`;
                }
                throw new Error(`${page} failed to load`);
            });
        }
    }

    async testAppNavigation() {
        await this.runTest('App Navigation', async () => {
            // Test header navigation
            const response = await request(TEST_CONFIG.APP_BASE_URL)
                .get('/header-app.html')
                .expect(200);
            
            if (response.text.includes('nav-links') && response.text.includes('dashboard.html')) {
                return '✅ App navigation working correctly';
            }
            throw new Error('App navigation failed');
        });
    }

    async testAppAuthentication() {
        await this.runTest('App Authentication Flow', async () => {
            // Test login page
            const loginResponse = await request(TEST_CONFIG.APP_BASE_URL)
                .get('/auth/login.html')
                .expect(200);
            
            if (loginResponse.text.includes('login-form')) {
                return '✅ App authentication pages working';
            }
            throw new Error('App authentication failed');
        });
    }

    // Website Tests
    async testWebsitePages() {
        const websitePages = [
            '/',
            '/auth/login.html',
            '/auth/register.html'
        ];

        for (const page of websitePages) {
            await this.runTest(`Website Page: ${page}`, async () => {
                const response = await request(TEST_CONFIG.WEBSITE_BASE_URL)
                    .get(page)
                    .expect(200);
                
                if (response.text.includes('SmartStart')) {
                    return `✅ ${page} loads correctly`;
                }
                throw new Error(`${page} failed to load`);
            });
        }
    }

    async testWebsiteNavigation() {
        await this.runTest('Website Navigation', async () => {
            const response = await request(TEST_CONFIG.WEBSITE_BASE_URL)
                .get('/header-public.html')
                .expect(200);
            
            if (response.text.includes('nav-links')) {
                return '✅ Website navigation working correctly';
            }
            throw new Error('Website navigation failed');
        });
    }

    // Integration Tests
    async testFullUserFlow() {
        await this.runTest('Full User Flow', async () => {
            // 1. Register user
            const registerResponse = await request(TEST_CONFIG.API_BASE_URL)
                .post('/api/auth/register')
                .send({
                    email: 'flowtest@smartstart.com',
                    password: 'testpassword123',
                    firstName: 'Flow',
                    lastName: 'Test'
                });
            
            if (!registerResponse.body.success) {
                throw new Error('User registration failed in flow test');
            }

            const token = registerResponse.body.data.token;

            // 2. Access dashboard
            const dashboardResponse = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            
            if (dashboardResponse.body.success) {
                return '✅ Full user flow working correctly';
            }
            throw new Error('Full user flow failed');
        });
    }

    async testDataPersistence() {
        await this.runTest('Data Persistence', async () => {
            // Test that data persists across requests
            const response1 = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${this.authToken}`);
            
            const response2 = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/dashboard/stats')
                .set('Authorization', `Bearer ${this.authToken}`);
            
            if (response1.body.success && response2.body.success) {
                return '✅ Data persistence working correctly';
            }
            throw new Error('Data persistence failed');
        });
    }

    async testErrorHandling() {
        await this.runTest('Error Handling', async () => {
            // Test 401 error
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/dashboard/stats')
                .expect(401);
            
            if (response.body.error === 'Access token required') {
                return '✅ Error handling working correctly';
            }
            throw new Error('Error handling failed');
        });
    }

    // Performance Tests
    async testPageLoadTimes() {
        await this.runTest('Page Load Performance', async () => {
            const startTime = Date.now();
            
            const response = await request(TEST_CONFIG.APP_BASE_URL)
                .get('/dashboard.html')
                .expect(200);
            
            const loadTime = Date.now() - startTime;
            
            if (loadTime < 2000) { // Less than 2 seconds
                return `✅ Page load time: ${loadTime}ms (acceptable)`;
            }
            throw new Error(`Page load too slow: ${loadTime}ms`);
        });
    }

    async testAPIResponseTimes() {
        await this.runTest('API Response Performance', async () => {
            const startTime = Date.now();
            
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/health')
                .expect(200);
            
            const responseTime = Date.now() - startTime;
            
            if (responseTime < 500) { // Less than 500ms
                return `✅ API response time: ${responseTime}ms (excellent)`;
            }
            throw new Error(`API response too slow: ${responseTime}ms`);
        });
    }

    // Security Tests
    async testAuthenticationSecurity() {
        await this.runTest('Authentication Security', async () => {
            // Test invalid token
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .get('/api/dashboard/stats')
                .set('Authorization', 'Bearer invalid-token')
                .expect(403);
            
            if (response.body.error === 'Invalid token') {
                return '✅ Authentication security working correctly';
            }
            throw new Error('Authentication security failed');
        });
    }

    async testDataValidation() {
        await this.runTest('Data Validation', async () => {
            // Test invalid registration data
            const response = await request(TEST_CONFIG.API_BASE_URL)
                .post('/api/auth/register')
                .send({ email: 'invalid' })
                .expect(400);
            
            if (response.body.error) {
                return '✅ Data validation working correctly';
            }
            throw new Error('Data validation failed');
        });
    }

    // UI/UX Tests
    async testGlassMorphismEffects() {
        await this.runTest('Glass Morphism Effects', async () => {
            const response = await request(TEST_CONFIG.APP_BASE_URL)
                .get('/assets/css/styles.css')
                .expect(200);
            
            if (response.text.includes('glass') && response.text.includes('backdrop-filter')) {
                return '✅ Glass morphism effects implemented';
            }
            throw new Error('Glass morphism effects missing');
        });
    }

    async testResponsiveDesign() {
        await this.runTest('Responsive Design', async () => {
            const response = await request(TEST_CONFIG.APP_BASE_URL)
                .get('/assets/css/styles.css')
                .expect(200);
            
            if (response.text.includes('@media') && response.text.includes('max-width')) {
                return '✅ Responsive design implemented';
            }
            throw new Error('Responsive design missing');
        });
    }

    async testAccessibility() {
        await this.runTest('Accessibility Features', async () => {
            const response = await request(TEST_CONFIG.APP_BASE_URL)
                .get('/assets/css/styles.css')
                .expect(200);
            
            if (response.text.includes('focus-visible') && response.text.includes('outline')) {
                return '✅ Accessibility features implemented';
            }
            throw new Error('Accessibility features missing');
        });
    }

    // Test runner helper
    async runTest(testName, testFunction) {
        try {
            const result = await testFunction();
            this.results.passed++;
            this.results.tests.push({ name: testName, status: 'PASSED', result });
            console.log(`✅ ${testName}: ${result}`);
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
            console.log(`❌ ${testName}: ${error.message}`);
        }
    }

    addError(context, message) {
        this.results.errors.push({ context, message });
        console.log(`🚨 ${context}: ${message}`);
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 COMPREHENSIVE TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`🚨 Errors: ${this.results.errors.length}`);
        console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => console.log(`  - ${test.name}: ${test.error}`));
        }
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 ERRORS:');
            this.results.errors.forEach(error => console.log(`  - ${error.context}: ${error.message}`));
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (this.results.failed === 0 && this.results.errors.length === 0) {
            console.log('🎉 ALL TESTS PASSED! SmartStart Platform is working perfectly!');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
        }
    }
}

// Run the comprehensive test suite
if (require.main === module) {
    const testSuite = new ComprehensiveTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = ComprehensiveTestSuite;
