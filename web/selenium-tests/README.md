# MockAI Web Application - Selenium E2E Automation Suite & Excel Analysis Framework

> **Directory**: `web/selenium-tests`  
> **Target Application**: MockAI React / Vite Web Frontend (`http://localhost:5173`)  
> **Automation Tooling**: Selenium WebDriver v4, ChromeDriver / GeckoDriver, Node.js, Python `openpyxl`

---

## 📌 Overview

This dedicated testing suite provides complete **End-to-End (E2E) automated testing** for the MockAI Web Application, stored in an isolated Node.js project directory under `web/selenium-tests`.

It automatically exercises all 9 web application modules (Auth, Dashboard, Interview Room, Practice Quiz, Resume ATS Scanner, Job Portal, Session History Analytics, Profile Settings, and Video Mock Room) and generates an **Executive Excel Analysis Report** (`MockAI_Web_E2E_Selenium_Test_Suite_Analysis.xlsx`).

---

## 📁 Directory Structure

```
web/selenium-tests/
├── package.json                          # Node.js dependencies & test scripts
├── selenium.config.js                    # Selenium browser capabilities & baseUrl config
├── generate_excel_report.py              # Openpyxl Excel analysis report generator
├── test_execution_results.json           # Raw test execution metadata & timing log
├── MockAI_Web_E2E_Selenium_Test_Suite_Analysis.xlsx  # Generated Excel Report
├── README.md                             # Framework documentation
├── utils/
│   ├── seleniumDriver.js                 # Selenium WebDriver manager & helper utilities
│   └── testReporter.js                   # Real-time logger & execution tracker
└── tests/
    ├── 01_auth.test.js                   # Module 1: Auth & Onboarding (40 Test Cases)
    ├── 02_home_dashboard.test.js         # Module 2: Home & Dashboard (35 Test Cases)
    ├── 03_interview_flow.test.js         # Module 3: AI Interview Room (45 Test Cases)
    ├── 04_quiz_practice.test.js          # Module 4: Practice Quiz & Code Challenges (30 Test Cases)
    ├── 05_resume_analysis.test.js        # Module 5: Resume Upload & ATS Scanner (25 Test Cases)
    ├── 06_jobs_portal.test.js            # Module 6: Jobs Portal & Applications (25 Test Cases)
    ├── 07_session_analytics.test.js      # Module 7: Session History & Charts (20 Test Cases)
    ├── 08_profile_settings.test.js       # Module 8: Profile & Dark Theme (20 Test Cases)
    ├── 09_video_interview.test.js        # Module 9: Video Mock Interview (15 Test Cases)
    └── run_all_e2e_tests.js              # Master test suite runner
```

---

## 🛠️ Prerequisites & Setup

### 1. Requirements
- **Node.js**: v18.x or higher
- **Python**: 3.8+ with `openpyxl` installed (`pip install openpyxl`)
- **Chrome / Firefox Browser**: Google Chrome or Mozilla Firefox

### 2. Start Web Application Development Server
Before running tests, ensure the Web application is running locally:

```bash
cd web
npm run dev
# Server running at http://localhost:5173
```

---

## 🚀 Running Web Selenium Tests & Generating Excel Reports

### Option A: Complete Run (Execute Suite + Generate Excel Report)
```bash
cd web/selenium-tests
npm run test:all
```

### Option B: Run Master E2E Runner
```bash
npm test
```

### Option C: Run Module-Specific Test Suites
```bash
npm run test:auth        # Test Authentication & Onboarding
npm run test:home        # Test Home & Dashboard
npm run test:interview   # Test AI Interview Room
npm run test:quiz        # Test Practice Quiz & Code Challenges
npm run test:resume      # Test Resume Upload & ATS Scanner
npm run test:jobs        # Test Jobs Portal & Applications
npm run test:sessions    # Test Session History & Analytics
npm run test:profile     # Test Profile & Dark Mode Settings
npm run test:video       # Test Video Mock Interview
```

### Option D: Generate Excel Analysis Report Only
```bash
npm run generate-excel
# OR
python generate_excel_report.py
```

---

## 📊 Excel Analysis Report Features

The generated `.xlsx` report (`MockAI_Web_E2E_Selenium_Test_Suite_Analysis.xlsx`) includes:

1. **Executive Dashboard Sheet**:
   - High-level KPI summary cards (Total Tests, Passed, Failed, Overall Pass Rate %).
   - Module breakdown table with individual pass rates and risk assessments.
   - Selenium browser capabilities and environment configuration specs.

2. **Web Selenium E2E Test Cases Sheet**:
   - Detailed breakdown of 255+ test scenarios across 9 web application modules.
   - Information columns: `Test ID`, `Web Module`, `Category`, `Test Scenario`, `Pre-Conditions`, `Execution Steps`, `Target Route`, `Expected Result`, `Actual Verdict`, `Priority`, `Execution Mode`, `Status`.
   - Conditional styling (Emerald Green for **PASSED**, Soft Rose for **FAILED**, Red badges for **Critical** priority).
   - Auto-filter headers enabled on all columns.

---

## ⚙️ Configuration Adjustments

Edit `selenium.config.js` or set environment variables:

```javascript
// Environment Variables Override:
process.env.TEST_BASE_URL = 'http://localhost:5173';
process.env.TEST_BROWSER = 'chrome'; // 'chrome' or 'firefox'
process.env.HEADLESS = 'true';       // 'true' or 'false'
```
