/**
 * ============================================================================
 * MockAI Android Appium Testing Framework Configuration
 * Target File: frontend/appium-tests/appium.config.js
 * ============================================================================
 */

const path = require('path');

const APK_PATH = process.env.ANDROID_APK_PATH || 
  path.resolve(__dirname, '../app/build/outputs/apk/debug/app-debug.apk');

module.exports = {
  // Appium Server Connection Details
  server: {
    host: process.env.APPIUM_HOST || '127.0.0.1',
    port: parseInt(process.env.APPIUM_PORT || '4723', 10),
    path: '/'
  },

  // Android Capabilities for UiAutomator2
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
    'appium:udid': process.env.ANDROID_UDID || 'emulator-5554',
    'appium:app': APK_PATH,
    'appium:appPackage': 'com.aiinterview',
    'appium:appActivity': 'com.aiinterview.MainActivity',
    'appium:noReset': false,
    'appium:fullReset': false,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 180,
    'appium:adbExecTimeout': 60000,
    'appium:uiautomator2ServerInstallTimeout': 60000
  },

  // Test Timeouts (ms)
  timeouts: {
    implicit: 5000,
    explicit: 15000,
    pageLoad: 30000
  }
};
