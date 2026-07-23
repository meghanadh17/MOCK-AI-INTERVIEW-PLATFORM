# MockAi - Android App Client

This directory contains the Android application code for **MockAi**. The app provides candidates with a native platform to conduct video-practice mock interviews (tracking gaze, posture, and facial expressions) and test theoretical skills with conceptual quizzes.

---

## 🛠 Tech Stack & Specifications

- **Language**: Kotlin 2.x
- **Build Configurations**:
  - **Minimum SDK**: `26` (Android 8.0 Oreo)
  - **Target SDK**: `35` (Android 15)
  - **Compile SDK**: `36` (Android 16)
  - **Java Version**: `17` (Source & target compatibility)
- **Dependency Injection**: Dagger Hilt (with standard annotation processor annotations)
- **UI Architecture**: Hybrid View Model:
  - **XML Layouts & View Binding** for core legacy screen navigation.
  - **Jetpack Compose** for modern interactive elements.
- **Local Storage Cache**: Room DB (SQLite cache storage for offline video sessions metadata and analytics metrics).
- **Network Client**: Retrofit 2 + OkHttp 4 (with WebSocket bindings for real-time speech and behavioral telemetries).

---

## ⚙️ Local Network Setup (Connecting to Backend)

Because the Android app runs either on an emulator or physical device, it needs to connect to the backend server running on your computer.

1. Find your computer's local network/Wi-Fi IP address:
   - **Windows**: Run `ipconfig` in CMD/PowerShell (look for IPv4 Address)
   - **macOS**: Run `ipconfig getifaddr en0` (or `ifconfig | grep "inet "`)
   - **Linux**: Run `hostname -I | awk '{print $1}'`
2. Open [`gradle.properties`](file:///e:/MocrAI/frontend/gradle.properties) in the root of the `frontend/` directory.
3. Locate the `apiBaseUrl` variable and update it to your local IP address:
   ```properties
   apiBaseUrl=http://YOUR_LOCAL_IP:8000/api/v1/
   ```
   *(e.g., `apiBaseUrl=http://192.168.31.46:8000/api/v1/`)*

This setting is dynamically read by the build script inside [`app/build.gradle.kts`](file:///e:/MocrAI/frontend/app/build.gradle.kts) to compile the API configuration.

---

## 🚀 Building & Running the App

Ensure you are inside the `frontend/` directory before executing the Gradle wrapper scripts:

### 1. Compile Kotlin Code
Compiles all sources and runs annotation processing validation (Hilt injection checks):
```bash
./gradlew :app:compileDebugKotlin
```

### 2. Assemble Debug APK
Generates the debug installer package (`app-debug.apk`) inside `app/build/outputs/apk/debug/`:
```bash
./gradlew assembleDebug
```

### 3. Install App on Connected Device/Emulator
Pushes the compiled package and launches the app on your running emulator or plugged-in debug device:
```bash
./gradlew installDebug
```

### 4. Clean Build Files
Deletes generated compilation outputs and cached configurations to trigger a fresh build:
```bash
./gradlew clean
```
