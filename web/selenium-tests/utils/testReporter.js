/**
 * ============================================================================
 * MockAI Web Application Selenium Test Suite Reporter & Result Tracker
 * Target File: web/selenium-tests/utils/testReporter.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

class WebTestReporter {
  constructor() {
    this.results = {
      executionTime: new Date().toISOString(),
      platform: 'Web Application (React / Vite)',
      baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5173',
      total: 0,
      passed: 0,
      failed: 0,
      durationTotalMs: 0,
      details: []
    };
    this.startTime = Date.now();
  }

  record(testId, moduleName, category, scenario, steps, expected, priority, status, durationMs, error = null) {
    this.results.total++;
    if (status === 'PASSED') {
      this.results.passed++;
    } else {
      this.results.failed++;
    }

    this.results.durationTotalMs += durationMs;

    const detailObj = {
      testId,
      moduleName,
      category,
      scenario,
      steps,
      expected,
      actual: status === 'PASSED' ? 'Executed successfully and matched expected outcome.' : `Failed: ${error ? error.message : 'Unknown error'}`,
      priority,
      status,
      durationMs,
      error: error ? error.message : null,
      timestamp: new Date().toISOString()
    };

    this.results.details.push(detailObj);

    const icon = status === 'PASSED' ? '✅' : '❌';
    console.log(`  [${icon}] ${testId} | ${category} -> ${scenario} (${durationMs}ms)`);
    if (error) {
      console.error(`      └─ Error: ${error.message}`);
    }
  }

  saveResultsJson(filePath = null) {
    const outputPath = filePath || path.join(__dirname, '../test_execution_results.json');
    this.results.durationTotalMs = Date.now() - this.startTime;
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2), 'utf-8');
    console.log(`\n💾 Test execution details saved to: ${outputPath}`);
  }

  printSummary() {
    const totalMs = Date.now() - this.startTime;
    const passRate = this.results.total > 0 ? ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;

    console.log('\n================================================================');
    console.log('📊 MOCKAI WEB APPLICATION SELENIUM E2E EXECUTION SUMMARY');
    console.log('================================================================');
    console.log(`🌐 Base URL          : ${this.results.baseUrl}`);
    console.log(`🧪 Total Test Cases  : ${this.results.total}`);
    console.log(`✅ Passed            : ${this.results.passed}`);
    console.log(`❌ Failed            : ${this.results.failed}`);
    console.log(`📈 Pass Rate         : ${passRate}%`);
    console.log(`⏱️  Total Duration   : ${(totalMs / 1000).toFixed(2)} seconds`);
    console.log('================================================================\n');
  }
}

module.exports = new WebTestReporter();
