/**
 * ============================================================================
 * MockAI Web Application Selenium Testing Framework Configuration
 * Target File: web/selenium-tests/selenium.config.js
 * ============================================================================
 */

module.exports = {
  // Base Application URL
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',

  // Browser Settings
  browser: process.env.TEST_BROWSER || 'chrome', // 'chrome' | 'firefox'
  isHeadless: process.env.HEADLESS === 'true',

  // Viewport Settings
  windowSize: {
    width: 1440,
    height: 900
  },

  // Timeout Settings (ms)
  timeouts: {
    implicit: 5000,
    explicit: 10000,
    pageLoad: 30000
  }
};
