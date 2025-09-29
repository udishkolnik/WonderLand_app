#!/usr/bin/env node

/**
 * Test Runner for SmartStart Platform
 * Runs all tests and provides detailed reporting
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 SmartStart Platform Test Runner');
console.log('=====================================\n');

// Check if all servers are running
async function checkServers() {
    const servers = [
        { name: 'Backend API', url: 'http://localhost:3344/api/health' },
        { name: 'App Server', url: 'http://localhost:3345/dashboard.html' },
        { name: 'Website Server', url: 'http://localhost:3346/' }
    ];

    console.log('🔍 Checking server status...');
    
    for (const server of servers) {
        try {
            const response = await fetch(server.url);
            if (response.ok) {
                console.log(`✅ ${server.name}: Running`);
            } else {
                console.log(`❌ ${server.name}: Not responding`);
                return false;
            }
        } catch (error) {
            console.log(`❌ ${server.name}: Not running`);
            return false;
        }
    }
    
    return true;
}

// Run the comprehensive test suite
async function runTests() {
    try {
        console.log('\n🚀 Starting comprehensive test suite...\n');
        
        const testSuite = require('./comprehensive-test-suite');
        const suite = new testSuite();
        await suite.runAllTests();
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        process.exit(1);
    }
}

// Main execution
async function main() {
    const serversRunning = await checkServers();
    
    if (!serversRunning) {
        console.log('\n⚠️  Some servers are not running. Please start all servers first:');
        console.log('   Backend: cd backend && node clean-production-backend.js');
        console.log('   App: cd .. && node server.js');
        console.log('   Website: node website-server.js');
        console.log('\nThen run this test suite again.');
        process.exit(1);
    }
    
    await runTests();
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { checkServers, runTests };
