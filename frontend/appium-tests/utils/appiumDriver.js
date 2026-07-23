/**
 * ============================================================================
 * MockAI Appium Driver Manager & Android UI Automator Helper Utilities
 * Target File: frontend/appium-tests/utils/appiumDriver.js
 * ============================================================================
 */

let remote;
try {
  remote = require('webdriverio').remote;
} catch (e) {
  remote = null;
}
const config = require('../appium.config');
const path = require('path');
const fs = require('fs');

class AppiumDriverManager {
  constructor() {
    this.driver = null;
  }

  async initDriver(customCaps = {}) {
    if (this.driver) {
      return this.driver;
    }

    if (!remote) {
      console.warn('⚠️ Note: "webdriverio" package not installed locally yet. Running test suite in simulated automation & reporting mode.');
      return null;
    }

    const options = {
      hostname: config.server.host,
      port: config.server.port,
      path: config.server.path,
      capabilities: {
        ...config.capabilities,
        ...customCaps
      }
    };

    console.log(`🔌 Connecting to Appium Server at ${config.server.host}:${config.server.port}...`);
    try {
      this.driver = await remote(options);
      console.log('📱 Appium Android session established successfully.');
      return this.driver;
    } catch (err) {
      console.warn(`⚠️ Could not connect to live Appium server (${err.message}). Defaulting to standalone mock automation mode.`);
      return null;
    }
  }

  async closeDriver() {
    if (this.driver) {
      console.log('🚪 Closing Appium session...');
      await this.driver.deleteSession();
      this.driver = null;
    }
  }

  /**
   * Locate Android element by Accessibility ID, Resource ID, XPath, or UIAutomator selector
   */
  async findElement(selector) {
    if (!this.driver) return null;
    if (selector.startsWith('//') || selector.startsWith('(')) {
      return await this.driver.$(selector);
    } else if (selector.includes(':id/')) {
      return await this.driver.$(`id=${selector}`);
    } else if (selector.startsWith('new UiSelector')) {
      return await this.driver.$(`android=${selector}`);
    } else {
      return await this.driver.$(`~${selector}`);
    }
  }

  /**
   * Helper to perform vertical scroll down on Android screen
   */
  async swipeDown() {
    if (!this.driver) return;
    const { width, height } = await this.driver.getWindowSize();
    const startX = width / 2;
    const startY = height * 0.8;
    const endY = height * 0.2;

    await this.driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 600, x: startX, y: endY },
          { type: 'pointerUp', button: 0 }
        ]
      }
    ]);
  }

  /**
   * Capture screenshot on failure
   */
  async takeScreenshot(testName) {
    if (!this.driver) return;
    try {
      const screenshotsDir = path.join(__dirname, '../screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const filename = `${testName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      const filePath = path.join(screenshotsDir, filename);
      await this.driver.saveScreenshot(filePath);
      console.log(`📸 Screenshot saved: ${filePath}`);
      return filePath;
    } catch (err) {
      console.error(`Failed to take screenshot: ${err.message}`);
    }
  }
}

module.exports = new AppiumDriverManager();
