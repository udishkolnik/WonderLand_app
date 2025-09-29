#!/usr/bin/env node

/**
 * Test Runner with Monitoring
 * Runs tests with proper timeout handling and monitoring
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const config = {
  timeout: 120000, // 2 minutes total timeout
  testTimeout: 30000, // 30 seconds per test
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  verbose: true,
  coverage: false // Disable coverage for faster runs
};

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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTests(testPattern = null) {
  return new Promise((resolve, reject) => {
    log('🚀 Starting test runner with monitoring...', 'cyan');
    
    const args = [
      '--testTimeout', config.testTimeout.toString(),
      '--maxWorkers', config.maxWorkers.toString(),
      '--verbose',
      '--detectOpenHandles',
      '--forceExit'
    ];

    if (testPattern) {
      args.push('--testPathPattern', testPattern);
    }

    if (config.coverage) {
      args.push('--coverage');
    }

    log(`📋 Running: jest ${args.join(' ')}`, 'blue');
    
    const jest = spawn('npx', ['jest', ...args], {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JEST_TIMEOUT: config.testTimeout.toString()
      }
    });

    let startTime = Date.now();
    let timeoutId;

    // Set overall timeout
    timeoutId = setTimeout(() => {
      log('⏰ Test run timed out, killing process...', 'yellow');
      jest.kill('SIGTERM');
      reject(new Error('Test run timed out'));
    }, config.timeout);

    jest.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        log(`✅ Tests completed successfully in ${duration}s`, 'green');
        resolve(code);
      } else {
        log(`❌ Tests failed with exit code ${code} in ${duration}s`, 'red');
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    jest.on('error', (error) => {
      clearTimeout(timeoutId);
      log(`💥 Test runner error: ${error.message}`, 'red');
      reject(error);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      log('🛑 Received SIGINT, stopping tests...', 'yellow');
      jest.kill('SIGTERM');
      process.exit(1);
    });

    process.on('SIGTERM', () => {
      log('🛑 Received SIGTERM, stopping tests...', 'yellow');
      jest.kill('SIGTERM');
      process.exit(1);
    });
  });
}

// Main execution
async function main() {
  try {
    const testPattern = process.argv[2];
    
    if (testPattern) {
      log(`🎯 Running tests matching: ${testPattern}`, 'magenta');
    } else {
      log('🎯 Running all tests', 'magenta');
    }

    await runTests(testPattern);
    process.exit(0);
  } catch (error) {
    log(`💥 Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, config };
