# MockAi - Interactive Web Portal Client

This directory contains the Vite-powered React web application frontend for **MockAi**. It serves as the primary candidate portal, providing a dashboard for mock interviews, text-based simulation rooms, resume evaluations, conceptual quizzes, and performance analytics.

---

## 🛠 Tech Stack

- **Framework**: React 19 (Functional components, hooks)
- **Tooling & Bundler**: Vite (Fast HMR development environment)
- **Language**: TypeScript (Strong compiler check typing)
- **Styling**: Tailwind CSS v4 (Carbon/Zinc dark-themed layout)
- **State Management**: Zustand (Clean, minimal store pattern)
- **Data Fetching**: Axios + TanStack React Query v5 (Caching and automatic syncing)
- **UI Components**: Radix UI (Unstyled accessible primitives) + shadcn/ui
- **Icons & Motion**: HugeIcons / Lucide-React & Framer Motion (Subtle micro-animations)

---

## ⚙️ Environment Configuration

Ensure you create a `.env` file in this directory to specify your backend API base URL:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1
```

---

## 🚀 Execution & Build Commands

Make sure Node.js (version 18+ or 20+) is installed, then run:

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
Spins up a local development server with Hot Module Replacement (HMR):
```bash
npm run dev
```
By default, the application runs on **`http://localhost:5173`**.

### 3. Build for Production
Compiles TypeScript, processes assets, and builds a minified production bundle in the `dist/` directory:
```bash
npm run build
```

### 4. Preview Production Build
Runs a local server hosting the compiled bundle to verify it works exactly as expected prior to cloud deployments:
```bash
npm run preview
```

### 5. Code Linter Check
Analyzes code styles and syntax using ESLint rules:
```bash
npm run lint
```
