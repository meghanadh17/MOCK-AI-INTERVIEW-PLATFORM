/**
 * ============================================================================
 * MockAI Android Appium E2E Master Test Suite Runner
 * Target File: frontend/appium-tests/tests/run_all_e2e_tests.js
 * ============================================================================
 */

const appiumDriver = require('../utils/appiumDriver');
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

async function executeFullAppiumE2ESuite() {
  console.log('\n================================================================');
  console.log('🚀 STARTING MOCKAI ANDROID APPIUM E2E COMPLETE AUTOMATION SUITE');
  console.log('📱 Target App Package : com.aiinterview');
  console.log('📍 Location           : frontend/appium-tests/');
  console.log('================================================================\n');

  try {
    // Attempt to initialize Appium session if server is available
    await appiumDriver.initDriver();

    // Run all 8 test modules
    await runAuthTests(appiumDriver);
    await runHomeDashboardTests(appiumDriver);
    await runInterviewFlowTests(appiumDriver);
    await runQuizPracticeTests(appiumDriver);
    await runResumeAnalysisTests(appiumDriver);
    await runJobsPortalTests(appiumDriver);
    await runSessionAnalyticsTests(appiumDriver);
    await runProfileSettingsTests(appiumDriver);

  } catch (error) {
    console.error('❌ Critical Execution Error during Appium test run:', error);
  } finally {
    await appiumDriver.closeDriver();
    
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

executeFullAppiumE2ESuite();
