/**
 * ============================================================================
 * MockAI Web Application Selenium Master E2E Test Suite Runner
 * Target File: web/selenium-tests/tests/run_all_e2e_tests.js
 * ============================================================================
 */

const seleniumDriver = require('../utils/seleniumDriver');
const reporter = require('../utils/testReporter');
const { execSync } = require('child_process');
const path = require('path');

const { runAuthTests } = require('./01_auth.test');
const { runHomeDashboardTests } = require('./02_home_dashboard.test');
const { runInterviewFlowTests } = require('./03_interview_flow.test');
const { runQuizPracticeTests } = require('./04_quiz_practice.test');
const { runResumeAnalysisTests } = require('./05_resume_analysis.test');
const { runJobsPortalTests } = require('./06_jobs_portal.test');
const { runSessionAnalyticsTests } = require('./07_session_analytics.test');
const { runProfileSettingsTests } = require('./08_profile_settings.test');
const { runVideoInterviewTests } = require('./09_video_interview.test');

async function executeFullWebSeleniumE2ESuite() {
  console.log('\n================================================================');
  console.log('🚀 STARTING MOCKAI WEB APPLICATION SELENIUM COMPLETE E2E SUITE');
  console.log('🌐 Target URL        : http://localhost:5173');
  console.log('📍 Location          : web/selenium-tests/');
  console.log('================================================================\n');

  try {
    // Initialize Selenium Web Browser Session
    await seleniumDriver.initDriver();

    // Execute all 9 test modules
    await runAuthTests(seleniumDriver);
    await runHomeDashboardTests(seleniumDriver);
    await runInterviewFlowTests(seleniumDriver);
    await runQuizPracticeTests(seleniumDriver);
    await runResumeAnalysisTests(seleniumDriver);
    await runJobsPortalTests(seleniumDriver);
    await runSessionAnalyticsTests(seleniumDriver);
    await runProfileSettingsTests(seleniumDriver);
    await runVideoInterviewTests(seleniumDriver);

  } catch (error) {
    console.error('❌ Critical Execution Error during Web Selenium test run:', error);
  } finally {
    await seleniumDriver.closeDriver();
    
    // Save execution metadata for Excel report generator
    reporter.saveResultsJson();
    reporter.printSummary();

    // Trigger Excel Report Generation
    console.log('📊 Invoking Excel Analysis Report Generator...');
    try {
      const pythonScript = path.join(__dirname, '../generate_excel_report.py');
      const output = execSync(`python "${pythonScript}"`, { encoding: 'utf-8' });
      console.log(output);
    } catch (excelErr) {
      console.warn('⚠️ Note: Excel report generation script can also be run via: npm run generate-excel');
    }
  }
}

executeFullWebSeleniumE2ESuite();
