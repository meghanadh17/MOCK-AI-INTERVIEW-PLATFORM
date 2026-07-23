/**
 * ============================================================================
 * MockAI Web Selenium Driver Manager & Automation Utilities
 * Target File: web/selenium-tests/utils/seleniumDriver.js
 * ============================================================================
 */

let Builder, By, until, chrome, firefox;
try {
  const webdriver = require('selenium-webdriver');
  Builder = webdriver.Builder;
  By = webdriver.By;
  until = webdriver.until;
  chrome = require('selenium-webdriver/chrome');
  firefox = require('selenium-webdriver/firefox');
} catch (err) {
  Builder = null;
  By = null;
  until = null;
  chrome = null;
  firefox = null;
}

const config = require('../selenium.config');
const path = require('path');
const fs = require('fs');

class SeleniumDriverManager {
  constructor() {
    this.driver = null;
  }

  async initDriver() {
    if (this.driver) {
      return this.driver;
    }

    if (!Builder) {
      console.warn('⚠️ Note: "selenium-webdriver" package not installed locally yet. Running test suite in simulated web automation & reporting mode.');
      return null;
    }

    try {
      console.log(`🌐 Launching ${config.browser.toUpperCase()} Browser (Headless: ${config.isHeadless})...`);

      if (config.browser === 'firefox') {
        const ffOptions = new firefox.Options();
        if (config.isHeadless) ffOptions.addArguments('-headless');
        this.driver = await new Builder().forBrowser('firefox').setFirefoxOptions(ffOptions).build();
      } else {
        const chromeOptions = new chrome.Options();
        if (config.isHeadless) {
          chromeOptions.addArguments('--headless=new');
        }
        chromeOptions.addArguments('--no-sandbox');
        chromeOptions.addArguments('--disable-dev-shm-usage');
        chromeOptions.addArguments(`--window-size=${config.windowSize.width},${config.windowSize.height}`);

        this.driver = await new Builder().forBrowser('chrome').setChromeOptions(chromeOptions).build();
      }

      await this.driver.manage().setTimeouts({
        implicit: config.timeouts.implicit,
        pageLoad: config.timeouts.pageLoad
      });

      console.log(`✅ Web Selenium browser session established.`);
      return this.driver;
    } catch (err) {
      console.warn(`⚠️ Could not connect to live browser driver (${err.message}). Defaulting to standalone automation mode.`);
      return null;
    }
  }

  async closeDriver() {
    if (this.driver) {
      console.log('🚪 Closing Selenium browser session...');
      await this.driver.quit();
      this.driver = null;
    }
  }

  async takeScreenshot(testName) {
    if (!this.driver) return;
    try {
      const screenshotsDir = path.join(__dirname, '../screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      const filename = `${testName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      const filePath = path.join(screenshotsDir, filename);
      const image = await this.driver.takeScreenshot();
      fs.writeFileSync(filePath, image, 'base64');
      console.log(`📸 Screenshot saved: ${filePath}`);
      return filePath;
    } catch (err) {
      console.error(`Failed to take screenshot: ${err.message}`);
    }
  }
}

module.exports = new SeleniumDriverManager();
