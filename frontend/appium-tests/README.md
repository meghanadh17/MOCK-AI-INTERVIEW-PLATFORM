# MockAI Android Mobile Application - Appium E2E Automation & Excel Analysis Framework

> **Directory**: `frontend/appium-tests`  
> **Target Application**: MockAI Android Mobile App (`com.aiinterview` / `com.aiinterview.MainActivity`)  
> **Automation Tooling**: Appium 2.x, WebdriverIO v8, UiAutomator2 Android Driver, Python `openpyxl`

---

## 📌 Overview

This dedicated testing suite provides **End-to-End (E2E) automated testing** for the MockAI Android mobile application, mirroring the web application's `frontend/selenuim-tests` structure.

It automatically exercises all core modules of the Android app, validates UI/UX interactions, Android system permissions, API integrations, and session storage, and generates a structured **Executive Excel Analysis Report** (`MockAI_Android_E2E_Appium_Test_Suite_Analysis.xlsx`).

---

## 📁 Directory Structure

```
frontend/appium-tests/
├── package.json                          # Node.js dependencies & test scripts
├── appium.config.js                      # Appium capabilities & server config
├── generate_excel_report.py              # Openpyxl Excel analysis report generator
├── test_execution_results.json           # Raw test execution metadata & timing log
├── MockAI_Android_E2E_Appium_Test_Suite_Analysis.xlsx  # Generated Excel Report
├── README.md                             # Framework documentation
├── utils/
│   ├── appiumDriver.js                   # WebdriverIO session & Android gesture helpers
│   └── testReporter.js                   # Real-time logger & execution tracker
└── tests/
    ├── 01_auth.test.js                   # Module 1: Auth & Onboarding (40 Test Cases)
    ├── 02_home_dashboard.test.js         # Module 2: Home & Dashboard (35 Test Cases)
    ├── 03_interview_flow.test.js         # Module 3: Interview Setup & AI Room (45 Test Cases)
    ├── 04_quiz_practice.test.js          # Module 4: Practice Quiz & Code Challenges (30 Test Cases)
    ├── 05_resume_analysis.test.js        # Module 5: Resume Upload & ATS Scanner (25 Test Cases)
    ├── 06_jobs_portal.test.js            # Module 6: Jobs Portal & Applications (25 Test Cases)
    ├── 07_session_analytics.test.js      # Module 7: Sessions History & Charts (20 Test Cases)
    ├── 08_profile_settings.test.js       # Module 8: Profile & Dark Theme (20 Test Cases)
    └── run_all_e2e_tests.js              # Master test suite runner
```

---

## 🛠️ Prerequisites & Environment Setup

### 1. Requirements
- **Node.js**: v18.x or higher
- **Python**: 3.8+ with `openpyxl` installed (`pip install openpyxl`)
- **Android Studio & SDK**: Android API Level 33 or 34 (Android 13/14)
- **Appium Server**: Appium v2.5.0+ installed globally (`npm install -g appium`)
- **UiAutomator2 Driver**: Installed via `appium driver install uiautomator2`

### 2. Build the Android APK
Before executing tests against a real device or emulator, assemble the debug APK:

```bash
cd frontend
./gradlew assembleDebug
```

The APK will be generated at `frontend/app/build/outputs/apk/debug/app-debug.apk`.

---

## 🚀 Running Appium Tests & Generating Excel Reports

### Option A: Complete Run (Execute Suite + Generate Excel Report)
```bash
cd frontend/appium-tests
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
npm run test:interview   # Test Interview Setup & AI Session
npm run test:quiz        # Test Practice Quiz
npm run test:resume      # Test Resume Upload & ATS Scanner
npm run test:jobs        # Test Jobs Portal & Applications
npm run test:sessions    # Test Session History & Analytics
npm run test:profile     # Test Profile & Dark Mode Settings
```

### Option D: Generate Excel Analysis Report Only
```bash
npm run generate-excel
# OR
python generate_excel_report.py
```

---

## 📊 Excel Analysis Report Features

The generated `.xlsx` report (`MockAI_Android_E2E_Appium_Test_Suite_Analysis.xlsx`) includes:

1. **Executive Dashboard Sheet**:
   - High-level KPI summary cards (Total Tests, Passed, Failed, Overall Pass Rate %).
   - Module breakdown table with individual pass rates and risk assessments.
   - Appium capabilities and test environment configuration specs.

2. **Appium E2E Test Cases Sheet**:
   - Detailed breakdown of 240+ test scenarios across 8 application modules.
   - Information columns: `Test ID`, `App Module`, `Category`, `Test Scenario`, `Pre-Conditions`, `Execution Steps`, `Target`, `Expected Result`, `Actual Result`, `Priority`, `Execution Mode`, `Status`.
   - Conditional styling (Emerald Green for **PASSED**, Soft Rose for **FAILED**, Red badges for **Critical** priority).
   - Auto-filter headers enabled on all columns.

---

## ⚙️ Configuration Adjustments

To run tests on a specific Android emulator or physical device, update environment variables or edit `appium.config.js`:

```javascript
// Environment Variables Override:
process.env.APPIUM_HOST = '127.0.0.1';
process.env.APPIUM_PORT = '4723';
process.env.ANDROID_DEVICE_NAME = 'Pixel_7_Pro_API_34';
process.env.ANDROID_UDID = 'emulator-5554';
process.env.ANDROID_APK_PATH = '/path/to/custom/app-debug.apk';
```
