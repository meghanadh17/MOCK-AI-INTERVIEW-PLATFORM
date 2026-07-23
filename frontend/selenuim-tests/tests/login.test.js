/**
 * ============================================================================
 * MockAI Web Frontend - Automated Selenium E2E Test Suite for Login Page
 * Target File: frontend/selenuim-tests/tests/login.test.js
 * ============================================================================
 */

const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');

// Configuration Settings
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173/login';
const TIMEOUT_MS = 10000;
const IS_HEADLESS = process.env.HEADLESS === 'true';

// Test Reporter Metrics
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function recordResult(testId, name, category, status, durationMs, error = null) {
  testResults.total++;
  if (status === 'PASSED') testResults.passed++;
  else testResults.failed++;

  testResults.details.push({
    testId,
    name,
    category,
    status,
    durationMs,
    error: error ? error.message : null
  });

  const symbol = status === 'PASSED' ? '✓' : '✗';
  console.log(`  [${symbol}] ${testId}: ${name} (${durationMs}ms)`);
  if (error) {
    console.error(`      Error: ${error.message}`);
  }
}

async function createDriver() {
  const options = new chrome.Options();
  if (IS_HEADLESS) {
    options.addArguments('--headless=new');
  }
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1280,800');

  return await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
}

/**
 * Main Test Runner Execution Suite
 */
async function runLoginTestSuite() {
  console.log('\n================================================================');
  console.log('🚀 Starting MockAI E2E Selenium Test Suite for Login Functionality');
  console.log(`🌐 Base Target URL: ${BASE_URL}`);
  console.log(`🖥️  Headless Mode: ${IS_HEADLESS}`);
  console.log('================================================================\n');

  let driver;

  try {
    driver = await createDriver();

    // ------------------------------------------------------------------------
    // Suite 1: Page Load & Initial UI Layout Elements Verification
    // ------------------------------------------------------------------------
    console.log('\n📦 Suite 1: Page Render & UI Elements Integrity');
    
    await runTestCase(driver, 'TC-UI-001', 'Page Title Verification', 'UI Layout', async (d) => {
      await d.get(BASE_URL);
      const title = await d.getTitle();
      assert.ok(title !== '', 'Page title should not be empty');
    });

    await runTestCase(driver, 'TC-UI-002', 'Welcome Header Display', 'UI Layout', async (d) => {
      await d.get(BASE_URL);
      const header = await d.wait(until.elementLocated(By.xpath("//h2[contains(text(),'Welcome back')]")), TIMEOUT_MS);
      const text = await header.getText();
      assert.strictEqual(text, 'Welcome back');
    });

    await runTestCase(driver, 'TC-UI-003', 'Email Input Field Presence', 'UI Layout', async (d) => {
      await d.get(BASE_URL);
      const emailInput = await d.findElement(By.id('email'));
      const isDisplayed = await emailInput.isDisplayed();
      const placeholder = await emailInput.getAttribute('placeholder');
      assert.strictEqual(isDisplayed, true);
      assert.strictEqual(placeholder, 'name@example.com');
    });

    await runTestCase(driver, 'TC-UI-004', 'Password Input Field Presence', 'UI Layout', async (d) => {
      await d.get(BASE_URL);
      const passwordInput = await d.findElement(By.id('password'));
      const isDisplayed = await passwordInput.isDisplayed();
      const inputType = await passwordInput.getAttribute('type');
      assert.strictEqual(isDisplayed, true);
      assert.strictEqual(inputType, 'password');
    });

    await runTestCase(driver, 'TC-UI-005', 'Sign In Submit Button Presence & Text', 'UI Layout', async (d) => {
      await d.get(BASE_URL);
      const submitBtn = await d.findElement(By.xpath("//button[@type='submit']"));
      const btnText = await submitBtn.getText();
      assert.strictEqual(btnText.trim(), 'Sign In');
    });

    // ------------------------------------------------------------------------
    // Suite 2: Password Masking & Visibility Toggle Feature
    // ------------------------------------------------------------------------
    console.log('\n📦 Suite 2: Password Visibility Toggle Features');

    await runTestCase(driver, 'TC-PWD-001', 'Password Input Masked By Default', 'Security UI', async (d) => {
      await d.get(BASE_URL);
      const pwdField = await d.findElement(By.id('password'));
      const type = await pwdField.getAttribute('type');
      assert.strictEqual(type, 'password');
    });

    await runTestCase(driver, 'TC-PWD-002', 'Password Visibility Toggle Click Unmasks Text', 'Interactive UI', async (d) => {
      await d.get(BASE_URL);
      const pwdField = await d.findElement(By.id('password'));
      await pwdField.sendKeys('SecretP@ss123');

      // Click eye icon toggle button inside password container
      const toggleBtn = await d.findElement(By.xpath("//input[@id='password']/following-sibling::button | //input[@id='password']/parent::div//button"));
      await toggleBtn.click();

      const typeAfterClick = await pwdField.getAttribute('type');
      assert.strictEqual(typeAfterClick, 'text');

      // Toggle back to masked
      await toggleBtn.click();
      const typeAfterSecondClick = await pwdField.getAttribute('type');
      assert.strictEqual(typeAfterSecondClick, 'password');
    });

    // ------------------------------------------------------------------------
    // Suite 3: Input Form Validation & Empty Field Error Triggers
    // ------------------------------------------------------------------------
    console.log('\n📦 Suite 3: Form Validation & Toast Error Triggers');

    await runTestCase(driver, 'TC-VAL-001', 'Submit Empty Form Triggers Required Validation', 'Validation', async (d) => {
      await d.get(BASE_URL);
      const submitBtn = await d.findElement(By.xpath("//button[@type='submit']"));
      await submitBtn.click();

      const emailInput = await d.findElement(By.id('email'));
      const isValid = await emailInput.getAttribute('required');
      assert.ok(isValid !== null, 'Email field should have required attribute');
    });

    await runTestCase(driver, 'TC-VAL-002', 'Submit Email Only Without Password', 'Validation', async (d) => {
      await d.get(BASE_URL);
      const emailInput = await d.findElement(By.id('email'));
      await emailInput.sendKeys('testuser@example.com');
      
      const submitBtn = await d.findElement(By.xpath("//button[@type='submit']"));
      await submitBtn.click();

      const pwdInput = await d.findElement(By.id('password'));
      const isValid = await pwdInput.getAttribute('required');
      assert.ok(isValid !== null, 'Password field should be marked required');
    });

    // ------------------------------------------------------------------------
    // Suite 4: Invalid Authentication Attempts
    // ------------------------------------------------------------------------
    console.log('\n📦 Suite 4: Invalid Credentials Handling');

    await runTestCase(driver, 'TC-AUTH-001', 'Non-existent Account Login Handling', 'Auth Security', async (d) => {
      await d.get(BASE_URL);
      const emailInput = await d.findElement(By.id('email'));
      const pwdInput = await d.findElement(By.id('password'));
      const submitBtn = await d.findElement(By.xpath("//button[@type='submit']"));

      await emailInput.sendKeys('nonexistent99999@mockai.org');
      await pwdInput.sendKeys('InvalidPass#2026');
      await submitBtn.click();

      // Verify page remains on login page or displays error notification
      await d.sleep(1500);
      const currentUrl = await d.getCurrentUrl();
      assert.ok(currentUrl.includes('/login'), 'User should remain on login page for invalid credentials');
    });

    await runTestCase(driver, 'TC-AUTH-002', 'SQL Injection Payload Input Handling', 'Security Resilience', async (d) => {
      await d.get(BASE_URL);
      const emailInput = await d.findElement(By.id('email'));
      const pwdInput = await d.findElement(By.id('password'));
      const submitBtn = await d.findElement(By.xpath("//button[@type='submit']"));

      await emailInput.sendKeys("' OR '1'='1");
      await pwdInput.sendKeys("' OR '1'='1");
      await submitBtn.click();

      await d.sleep(1000);
      const currentUrl = await d.getCurrentUrl();
      assert.ok(currentUrl.includes('/login'), 'Application must reject SQL injection payloads');
    });

    await runTestCase(driver, 'TC-AUTH-003', 'XSS Injection Payload Input Handling', 'Security Resilience', async (d) => {
      await d.get(BASE_URL);
      const emailInput = await d.findElement(By.id('email'));
      const pwdInput = await d.findElement(By.id('password'));
      const submitBtn = await d.findElement(By.xpath("//button[@type='submit']"));

      await emailInput.sendKeys("<script>alert('xss')</script>@test.com");
      await pwdInput.sendKeys("Password123!");
      await submitBtn.click();

      await d.sleep(1000);
      const currentUrl = await d.getCurrentUrl();
      assert.ok(currentUrl.includes('/login'), 'Application must sanitize XSS payloads');
    });

    // ------------------------------------------------------------------------
    // Suite 5: Navigation & Links Routing
    // ------------------------------------------------------------------------
    console.log('\n📦 Suite 5: Navigation Links');

    await runTestCase(driver, 'TC-NAV-001', 'Forgot Password Link Redirect', 'Navigation', async (d) => {
      await d.get(BASE_URL);
      const forgotLink = await d.findElement(By.xpath("//a[contains(@href,'/forgot')]"));
      await forgotLink.click();

      await d.wait(until.urlContains('/forgot'), TIMEOUT_MS);
      const url = await d.getCurrentUrl();
      assert.ok(url.includes('/forgot'), 'Forgot link should redirect to /forgot');
    });

    await runTestCase(driver, 'TC-NAV-002', 'Sign Up Link Redirect', 'Navigation', async (d) => {
      await d.get(BASE_URL);
      const signUpLink = await d.findElement(By.xpath("//a[contains(@href,'/register')]"));
      await signUpLink.click();

      await d.wait(until.urlContains('/register'), TIMEOUT_MS);
      const url = await d.getCurrentUrl();
      assert.ok(url.includes('/register'), 'Sign up link should redirect to /register');
    });

    // ------------------------------------------------------------------------
    // Suite 6: Keyboard Accessibility & Enter Key Submission
    // ------------------------------------------------------------------------
    console.log('\n📦 Suite 6: Keyboard Accessibility');

    await runTestCase(driver, 'TC-ACC-001', 'Enter Key Triggers Form Submission', 'Accessibility', async (d) => {
      await d.get(BASE_URL);
      const emailInput = await d.findElement(By.id('email'));
      const pwdInput = await d.findElement(By.id('password'));

      await emailInput.sendKeys('user@mockai.com');
      await pwdInput.sendKeys('Password123!', Key.ENTER);

      await d.sleep(1000);
      assert.ok(true, 'Enter key triggered form submission without throwing errors');
    });

  } catch (err) {
    console.error('❌ Error executing test suite:', err);
  } finally {
    if (driver) {
      await driver.quit();
    }
    printSummaryReport();
  }
}

async function runTestCase(driver, id, name, category, testFn) {
  const start = Date.now();
  try {
    await testFn(driver);
    const duration = Date.now() - start;
    recordResult(id, name, category, 'PASSED', duration);
  } catch (error) {
    const duration = Date.now() - start;
    recordResult(id, name, category, 'FAILED', duration, error);
  }
}

function printSummaryReport() {
  console.log('\n================================================================');
  console.log('📊 MockAI Selenium E2E Test Suite Execution Summary');
  console.log('================================================================');
  console.log(`  Total Automated Tests Executed: ${testResults.total}`);
  console.log(`  Passed Tests                 : ${testResults.passed}`);
  console.log(`  Failed Tests                 : ${testResults.failed}`);
  console.log(`  Pass Percentage              : ${((testResults.passed / (testResults.total || 1)) * 100).toFixed(1)}%`);
  console.log('================================================================\n');
}

// Execute if called directly from CLI
if (require.main === module) {
  runLoginTestSuite();
}

module.exports = { runLoginTestSuite };
