/**
 * SmartStart Platform - Error Handler
 * Global error handling and debugging
 */

// Enhanced Global error handler
window.addEventListener('error', (event) => {
  // Filter out browser extension errors more comprehensively
  if (event.filename && (
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('moz-extension://') ||
    event.filename.includes('safari-extension://') ||
    event.filename.includes('content-script.js') ||
    event.filename.includes('inpage.js') ||
    event.filename.includes('background.js') ||
    event.filename.includes('popup.js') ||
    event.message.includes('conflux') ||
    event.message.includes('Cannot redefine property') ||
    event.message.includes('Extension context invalidated') ||
    event.message.includes('chrome.runtime') ||
    event.message.includes('browser.runtime')
  )) {
    return; // Suppress browser extension errors
  }
  
  // Only log critical errors
  if (event.error && (
    event.error.name === 'ReferenceError' ||
    event.error.name === 'SyntaxError' ||
    event.error.name === 'TypeError'
  )) {
    console.warn('Critical error caught:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent the default browser behavior
});

// Console error override for better debugging
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args.join(' ');
  // Filter out browser extension errors
  if (message.includes('conflux') || 
      message.includes('inpage.js') || 
      message.includes('content-script.js') ||
      message.includes('chrome-extension://') ||
      message.includes('Cannot redefine property')) {
    return; // Suppress browser extension errors
  }
  originalConsoleError.apply(console, args);
};

// Safe DOM manipulation
window.safeQuerySelector = function(selector) {
  try {
    return document.querySelector(selector);
  } catch (error) {
    console.warn('Query selector error:', error);
    return null;
  }
};

window.safeAddEventListener = function(element, event, handler) {
  try {
    if (element && typeof element.addEventListener === 'function') {
      element.addEventListener(event, handler);
    }
  } catch (error) {
    console.warn('Event listener error:', error);
  }
};

// Initialize error handling when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Error handler initialized');
});
