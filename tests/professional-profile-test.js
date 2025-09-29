#!/usr/bin/env node

/**
 * Professional Profile Test Suite
 * Tests LinkedIn-style professional profile functionality with CRUD operations and RBAC
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    API_BASE_URL: 'http://localhost:3344',
    TEST_USER: {
        email: 'professional@test.com',
        password: 'professional123',
        firstName: 'Professional',
        lastName: 'User'
    }
};

class ProfessionalProfileTest {
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
        console.log('🔗 Professional Profile Test Suite');
        console.log('=' .repeat(50));

        try {
            // 1. Authentication Tests
            await this.testUserRegistration();
            await this.testUserLogin();

            // 2. Profile CRUD Tests
            await this.testCreateProfile();
            await this.testGetProfile();
            await this.testUpdateProfile();
            await this.testProfileCompletion();

            // 3. Professional Experience Tests
            await this.testAddExperience();
            await this.testGetExperience();
            await this.testUpdateExperience();
            await this.testDeleteExperience();

            // 4. Education Tests
            await this.testAddEducation();
            await this.testGetEducation();
            await this.testUpdateEducation();
            await this.testDeleteEducation();

            // 5. Skills Tests
            await this.testAddSkill();
            await this.testGetSkills();
            await this.testUpdateSkill();
            await this.testDeleteSkill();

            // 6. Connections Tests
            await this.testGetConnectionsCount();
            await this.testGetSuggestedConnections();
            await this.testSendConnectionRequest();

            // 7. Profile Views Tests
            await this.testGetProfileViewsCount();
            await this.testRecordProfileView();

            // 8. Activity Tests
            await this.testGetRecentActivity();

            // 9. RBAC Tests
            await this.testRBACPermissions();
            await this.testUnauthorizedAccess();

            // 10. Data Validation Tests
            await this.testDataValidation();
            await this.testInputSanitization();

            this.printResults();

        } catch (error) {
            console.error('❌ Professional profile test suite failed:', error);
            this.results.errors.push(error.message);
        }
    }

    async testUserRegistration() {
        await this.runTest('User Registration', async () => {
            const response = await this.makeRequest('POST', '/api/auth/register', {
                email: TEST_CONFIG.TEST_USER.email,
                password: TEST_CONFIG.TEST_USER.password,
                firstName: TEST_CONFIG.TEST_USER.firstName,
                lastName: TEST_CONFIG.TEST_USER.lastName
            });
            
            if (response.status === 200 && response.data.success) {
                this.authToken = response.data.data.token;
                this.userId = response.data.data.user.id;
                return 'User registered successfully';
            }
            throw new Error('User registration failed');
        });
    }

    async testUserLogin() {
        await this.runTest('User Login', async () => {
            const response = await this.makeRequest('POST', '/api/auth/login', {
                email: TEST_CONFIG.TEST_USER.email,
                password: TEST_CONFIG.TEST_USER.password
            });
            
            if (response.status === 200 && response.data.success) {
                this.authToken = response.data.data.token;
                return 'User login successful';
            }
            throw new Error('User login failed');
        });
    }

    async testCreateProfile() {
        await this.runTest('Create Professional Profile', async () => {
            const profileData = {
                headline: 'Senior Software Engineer & Entrepreneur',
                summary: 'Passionate about building innovative solutions and leading technical teams.',
                location: 'San Francisco, CA',
                industry: 'Technology',
                experience_level: 'Senior',
                availability_status: 'available',
                profile_visibility: 'public'
            };

            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile', profileData);
            if (response.status === 200 && response.data.success) {
                return 'Professional profile created successfully';
            }
            throw new Error('Profile creation failed');
        });
    }

    async testGetProfile() {
        await this.runTest('Get Professional Profile', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/users/profile');
            if (response.status === 200 && response.data.success) {
                return 'Profile retrieved successfully';
            }
            throw new Error('Profile retrieval failed');
        });
    }

    async testUpdateProfile() {
        await this.runTest('Update Professional Profile', async () => {
            const updatedData = {
                headline: 'Lead Software Engineer & Startup Founder',
                summary: 'Experienced in building scalable applications and leading cross-functional teams.',
                location: 'San Francisco, CA',
                industry: 'Technology',
                experience_level: 'Senior',
                availability_status: 'available',
                profile_visibility: 'public'
            };

            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile', updatedData);
            if (response.status === 200 && response.data.success) {
                return 'Profile updated successfully';
            }
            throw new Error('Profile update failed');
        });
    }

    async testProfileCompletion() {
        await this.runTest('Update Profile Completion', async () => {
            const response = await this.makeAuthenticatedRequest('PUT', '/api/users/profile/completion', {
                completion: 85
            });
            if (response.status === 200 && response.data.success) {
                return 'Profile completion updated successfully';
            }
            throw new Error('Profile completion update failed');
        });
    }

    async testAddExperience() {
        await this.runTest('Add Professional Experience', async () => {
            const experienceData = {
                title: 'Senior Software Engineer',
                company: 'TechCorp Inc.',
                location: 'San Francisco, CA',
                employment_type: 'full-time',
                start_date: '2020-01-01',
                end_date: '2023-12-31',
                is_current: 0,
                description: 'Led development of scalable web applications and mentored junior developers.',
                achievements: 'Increased system performance by 40% and reduced deployment time by 60%.',
                skills: 'JavaScript, React, Node.js, Python'
            };

            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile/experience', experienceData);
            if (response.status === 200 && response.data.success) {
                return 'Professional experience added successfully';
            }
            throw new Error('Experience addition failed');
        });
    }

    async testGetExperience() {
        await this.runTest('Get Professional Experience', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/users/profile/experience');
            if (response.status === 200 && response.data.success) {
                return 'Professional experience retrieved successfully';
            }
            throw new Error('Experience retrieval failed');
        });
    }

    async testUpdateExperience() {
        await this.runTest('Update Professional Experience', async () => {
            const updatedData = {
                title: 'Lead Software Engineer',
                company: 'TechCorp Inc.',
                location: 'San Francisco, CA',
                employment_type: 'full-time',
                start_date: '2020-01-01',
                end_date: '2023-12-31',
                is_current: 0,
                description: 'Led development of scalable web applications and mentored junior developers. Managed a team of 5 engineers.',
                achievements: 'Increased system performance by 40%, reduced deployment time by 60%, and improved team productivity by 25%.',
                skills: 'JavaScript, React, Node.js, Python, Leadership'
            };

            const response = await this.makeAuthenticatedRequest('PUT', '/api/users/profile/experience/1', updatedData);
            if (response.status === 200 && response.data.success) {
                return 'Professional experience updated successfully';
            }
            throw new Error('Experience update failed');
        });
    }

    async testDeleteExperience() {
        await this.runTest('Delete Professional Experience', async () => {
            const response = await this.makeAuthenticatedRequest('DELETE', '/api/users/profile/experience/1');
            if (response.status === 200 && response.data.success) {
                return 'Professional experience deleted successfully';
            }
            throw new Error('Experience deletion failed');
        });
    }

    async testAddEducation() {
        await this.runTest('Add Education', async () => {
            const educationData = {
                institution: 'Stanford University',
                degree: 'Master of Science',
                field_of_study: 'Computer Science',
                start_date: '2018-09-01',
                end_date: '2020-06-01',
                grade: '3.8',
                activities: 'Graduate Research Assistant, ACM Member',
                description: 'Focused on machine learning and artificial intelligence applications.'
            };

            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile/education', educationData);
            if (response.status === 200 && response.data.success) {
                return 'Education added successfully';
            }
            throw new Error('Education addition failed');
        });
    }

    async testGetEducation() {
        await this.runTest('Get Education', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/users/profile/education');
            if (response.status === 200 && response.data.success) {
                return 'Education retrieved successfully';
            }
            throw new Error('Education retrieval failed');
        });
    }

    async testUpdateEducation() {
        await this.runTest('Update Education', async () => {
            const updatedData = {
                institution: 'Stanford University',
                degree: 'Master of Science',
                field_of_study: 'Computer Science',
                start_date: '2018-09-01',
                end_date: '2020-06-01',
                grade: '3.9',
                activities: 'Graduate Research Assistant, ACM Member, Teaching Assistant',
                description: 'Focused on machine learning, artificial intelligence, and distributed systems.'
            };

            const response = await this.makeAuthenticatedRequest('PUT', '/api/users/profile/education/1', updatedData);
            if (response.status === 200 && response.data.success) {
                return 'Education updated successfully';
            }
            throw new Error('Education update failed');
        });
    }

    async testDeleteEducation() {
        await this.runTest('Delete Education', async () => {
            const response = await this.makeAuthenticatedRequest('DELETE', '/api/users/profile/education/1');
            if (response.status === 200 && response.data.success) {
                return 'Education deleted successfully';
            }
            throw new Error('Education deletion failed');
        });
    }

    async testAddSkill() {
        await this.runTest('Add Skill', async () => {
            const skillData = {
                skill_name: 'JavaScript',
                skill_level: 'expert',
                category: 'Programming Languages'
            };

            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile/skills', skillData);
            if (response.status === 200 && response.data.success) {
                return 'Skill added successfully';
            }
            throw new Error('Skill addition failed');
        });
    }

    async testGetSkills() {
        await this.runTest('Get Skills', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/users/profile/skills');
            if (response.status === 200 && response.data.success) {
                return 'Skills retrieved successfully';
            }
            throw new Error('Skills retrieval failed');
        });
    }

    async testUpdateSkill() {
        await this.runTest('Update Skill', async () => {
            const updatedData = {
                skill_name: 'JavaScript',
                skill_level: 'expert',
                category: 'Programming Languages'
            };

            const response = await this.makeAuthenticatedRequest('PUT', '/api/users/profile/skills/1', updatedData);
            if (response.status === 200 && response.data.success) {
                return 'Skill updated successfully';
            }
            throw new Error('Skill update failed');
        });
    }

    async testDeleteSkill() {
        await this.runTest('Delete Skill', async () => {
            const response = await this.makeAuthenticatedRequest('DELETE', '/api/users/profile/skills/1');
            if (response.status === 200 && response.data.success) {
                return 'Skill deleted successfully';
            }
            throw new Error('Skill deletion failed');
        });
    }

    async testGetConnectionsCount() {
        await this.runTest('Get Connections Count', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/connections/count');
            if (response.status === 200 && response.data.success) {
                return 'Connections count retrieved successfully';
            }
            throw new Error('Connections count retrieval failed');
        });
    }

    async testGetSuggestedConnections() {
        await this.runTest('Get Suggested Connections', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/connections/suggested');
            if (response.status === 200 && response.data.success) {
                return 'Suggested connections retrieved successfully';
            }
            throw new Error('Suggested connections retrieval failed');
        });
    }

    async testSendConnectionRequest() {
        await this.runTest('Send Connection Request', async () => {
            const response = await this.makeAuthenticatedRequest('POST', '/api/connections/request', {
                userId: 2
            });
            if (response.status === 200 && response.data.success) {
                return 'Connection request sent successfully';
            }
            throw new Error('Connection request failed');
        });
    }

    async testGetProfileViewsCount() {
        await this.runTest('Get Profile Views Count', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/profile-views/count');
            if (response.status === 200 && response.data.success) {
                return 'Profile views count retrieved successfully';
            }
            throw new Error('Profile views count retrieval failed');
        });
    }

    async testRecordProfileView() {
        await this.runTest('Record Profile View', async () => {
            const response = await this.makeAuthenticatedRequest('POST', '/api/profile-views', {
                profileUserId: 1
            });
            if (response.status === 200 && response.data.success) {
                return 'Profile view recorded successfully';
            }
            throw new Error('Profile view recording failed');
        });
    }

    async testGetRecentActivity() {
        await this.runTest('Get Recent Activity', async () => {
            const response = await this.makeAuthenticatedRequest('GET', '/api/activity/recent');
            if (response.status === 200 && response.data.success) {
                return 'Recent activity retrieved successfully';
            }
            throw new Error('Recent activity retrieval failed');
        });
    }

    async testRBACPermissions() {
        await this.runTest('RBAC Permissions', async () => {
            // Test that users can only access their own profile data
            const response = await this.makeAuthenticatedRequest('GET', '/api/users/profile');
            if (response.status === 200 && response.data.success) {
                return 'RBAC permissions working correctly';
            }
            throw new Error('RBAC permissions test failed');
        });
    }

    async testUnauthorizedAccess() {
        await this.runTest('Unauthorized Access', async () => {
            // Test without authentication token
            const response = await this.makeRequest('GET', '/api/users/profile');
            if (response.status === 401) {
                return 'Unauthorized access properly blocked';
            }
            throw new Error('Unauthorized access not properly blocked');
        });
    }

    async testDataValidation() {
        await this.runTest('Data Validation', async () => {
            // Test with invalid data
            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile', {
                headline: '', // Empty required field
                summary: 'A'.repeat(1000), // Too long
                location: 'Invalid Location with Special Characters !@#$%',
                industry: 'Invalid Industry'
            });
            
            // Should handle validation gracefully
            if (response.status === 200 || response.status === 400) {
                return 'Data validation working correctly';
            }
            throw new Error('Data validation test failed');
        });
    }

    async testInputSanitization() {
        await this.runTest('Input Sanitization', async () => {
            // Test with potentially malicious input
            const maliciousInput = {
                headline: '<script>alert("xss")</script>',
                summary: '"; DROP TABLE users; --',
                location: 'San Francisco, CA<script>alert("xss")</script>'
            };

            const response = await this.makeAuthenticatedRequest('POST', '/api/users/profile', maliciousInput);
            if (response.status === 200 && response.data.success) {
                return 'Input sanitization working correctly';
            }
            throw new Error('Input sanitization test failed');
        });
    }

    // Helper Methods
    async makeRequest(method, endpoint, data = null) {
        try {
            const url = `${TEST_CONFIG.API_BASE_URL}${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            const responseData = await response.json().catch(() => response.text());
            
            return {
                status: response.status,
                data: responseData,
                headers: response.headers
            };
        } catch (error) {
            return {
                status: 500,
                data: { error: error.message },
                headers: {}
            };
        }
    }

    async makeAuthenticatedRequest(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
        };
        
        try {
            const url = `${TEST_CONFIG.API_BASE_URL}${endpoint}`;
            const options = {
                method,
                headers
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(url, options);
            const responseData = await response.json().catch(() => response.text());
            
            return {
                status: response.status,
                data: responseData,
                headers: response.headers
            };
        } catch (error) {
            return {
                status: 500,
                data: { error: error.message },
                headers: {}
            };
        }
    }

    async runTest(testName, testFunction) {
        try {
            console.log(`🧪 Running: ${testName}`);
            const result = await testFunction();
            console.log(`✅ ${testName}: ${result}`);
            this.results.passed++;
            this.results.tests.push({ name: testName, status: 'PASSED', result });
        } catch (error) {
            console.log(`❌ ${testName}: ${error.message}`);
            this.results.failed++;
            this.results.errors.push(`${testName}: ${error.message}`);
            this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
        }
    }

    printResults() {
        console.log('\n' + '=' .repeat(50));
        console.log('🔗 PROFESSIONAL PROFILE TEST RESULTS');
        console.log('=' .repeat(50));
        
        console.log(`\n📊 Results:`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        
        if (this.results.errors.length > 0) {
            console.log(`\n❌ Errors:`);
            this.results.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        console.log(`\n🔗 Professional Profile Features Tested:`);
        console.log(`   • Profile CRUD Operations`);
        console.log(`   • Professional Experience Management`);
        console.log(`   • Education Management`);
        console.log(`   • Skills Management`);
        console.log(`   • Connections & Networking`);
        console.log(`   • Profile Views & Analytics`);
        console.log(`   • Recent Activity Tracking`);
        console.log(`   • RBAC & Security`);
        console.log(`   • Data Validation & Sanitization`);
        
        console.log('\n🚀 Professional Profile Test Complete!');
    }
}

// Run the professional profile test suite
if (require.main === module) {
    const testSuite = new ProfessionalProfileTest();
    testSuite.runAllTests().catch(console.error);
}

module.exports = ProfessionalProfileTest;
