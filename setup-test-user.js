#!/usr/bin/env node

/**
 * Setup Test User for Frontend Testing
 * Creates a test user and provides the token for localStorage
 */

const fetch = require('node-fetch');

async function setupTestUser() {
    try {
        console.log('🔧 Setting up test user for frontend testing...');
        
        // Register test user
        const registerResponse = await fetch('http://localhost:3344/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test1@test.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'User'
            })
        });
        
        if (!registerResponse.ok) {
            // Try login if user already exists
            console.log('User might already exist, trying login...');
            const loginResponse = await fetch('http://localhost:3344/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'test1@test.com',
                    password: 'testpassword123'
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('✅ Test user login successful');
                console.log('📋 Copy these values to your browser console:');
                console.log('');
                console.log('localStorage.setItem("smartstart_user", \'' + JSON.stringify(loginData.data.user) + '\');');
                console.log('localStorage.setItem("smartstart_token", "' + loginData.data.token + '");');
                console.log('');
                console.log('Then refresh the page to test the authenticated features.');
                return;
            }
        } else {
            const registerData = await registerResponse.json();
            console.log('✅ Test user registered successfully');
            console.log('📋 Copy these values to your browser console:');
            console.log('');
            console.log('localStorage.setItem("smartstart_user", \'' + JSON.stringify(registerData.data.user) + '\');');
            console.log('localStorage.setItem("smartstart_token", "' + registerData.data.token + '");');
            console.log('');
            console.log('Then refresh the page to test the authenticated features.');
        }
        
    } catch (error) {
        console.error('❌ Error setting up test user:', error.message);
        console.log('Make sure the backend is running on port 3344');
    }
}

if (require.main === module) {
    setupTestUser();
}

module.exports = { setupTestUser };
