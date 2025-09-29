#!/usr/bin/env node

/**
 * Quick Test Runner with Timer and Monitoring
 * Simple test runner that doesn't get stuck
 */

const { spawn } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${colors[color]}${message}${colors.reset}`);
}

function runQuickTest() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting quick test with monitoring...', 'cyan');
    
    const args = [
      '--testNamePattern', 'should create a new venture with valid data',
      '--testPathPattern', 'venture.test.js',
      '--verbose',
      '--maxWorkers', '1',
      '--testTimeout', '10000',
      '--detectOpenHandles',
      '--forceExit'
    ];

    log(`📋 Running: jest ${args.join(' ')}`, 'blue');
    
    const jest = spawn('npx', ['jest', ...args], {
      cwd: __dirname,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    let output = '';
    let errorOutput = '';
    let startTime = Date.now();
    let timeoutId;

    // Set 30 second timeout
    timeoutId = setTimeout(() => {
      log('⏰ Test timed out after 30 seconds, killing process...', 'yellow');
      jest.kill('SIGKILL');
      reject(new Error('Test timed out'));
    }, 30000);

    // Monitor output
    jest.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (text.includes('PASS') || text.includes('FAIL')) {
        log(`📊 ${text.trim()}`, 'blue');
      }
    });

    jest.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      if (text.includes('Error') || text.includes('timeout')) {
        log(`❌ ${text.trim()}`, 'red');
      }
    });

    jest.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      log(`⏱️  Test completed in ${duration}s`, 'cyan');
      
      if (code === 0) {
        log('✅ Test passed!', 'green');
        resolve({ code, output, duration });
      } else {
        log(`❌ Test failed with exit code ${code}`, 'red');
        log(`📝 Output: ${output.slice(-500)}`, 'yellow');
        reject({ code, output, errorOutput, duration });
      }
    });

    jest.on('error', (error) => {
      clearTimeout(timeoutId);
      log(`💥 Jest error: ${error.message}`, 'red');
      reject(error);
    });
  });
}

// Main execution
async function main() {
  try {
    log('🎯 Running quick venture test with monitoring...', 'magenta');
    
    const result = await runQuickTest();
    log('🎉 All tests completed successfully!', 'green');
    process.exit(0);
  } catch (error) {
    if (error.code !== undefined) {
      log(`💥 Test failed: ${error.message}`, 'red');
      log(`📊 Duration: ${error.duration}s`, 'yellow');
    } else {
      log(`💥 Runner failed: ${error.message}`, 'red');
    }
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('🛑 Received SIGINT, stopping...', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('🛑 Received SIGTERM, stopping...', 'yellow');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runQuickTest };
