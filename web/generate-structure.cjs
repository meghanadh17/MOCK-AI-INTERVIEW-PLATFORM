const fs = require('fs');
const path = require('path');

const files = {
  // ── CENTRALIZED API LAYER ──
  'src/api/axios.client.ts': `import axios from 'axios';
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
});
export default client;`,

  'src/api/websocket.client.ts': `export class WebSocketClient {
  private ws: WebSocket | null = null;
  constructor(private url: string) {}
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => console.log('WS Connected');
  }
  disconnect() {
    this.ws?.close();
  }
  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}`,

  'src/api/auth.api.ts': `import client from './axios.client';
export const authApi = {
  login: (data: any) => client.post('/auth/login', data),
  register: (data: any) => client.post('/auth/register', data),
  verifyOtp: (data: any) => client.post('/auth/verify-otp', data),
};`,

  'src/api/resume.api.ts': `import client from './axios.client';
export const resumeApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/resume/upload', fd);
  },
  getList: () => client.get('/resume/list'),
};`,

  'src/api/interview.api.ts': `import client from './axios.client';
export const interviewApi = {
  setup: (data: any) => client.post('/interview/setup', data),
  getQuestions: (id: string) => client.get(\`/interview/\${id}/questions\`),
};`,

  'src/api/video.api.ts': `import client from './axios.client';
export const videoApi = {
  saveMetrics: (id: string, metrics: any) => client.post(\`/video-interview/\${id}/metrics\`, metrics),
};`,

  'src/api/sessions.api.ts': `import client from './axios.client';
export const sessionsApi = {
  getList: () => client.get('/sessions'),
  getProgress: () => client.get('/sessions/progress'),
};`,

  'src/api/quiz.api.ts': `import client from './axios.client';
export const quizApi = {
  getList: () => client.get('/quiz/list'),
  submit: (id: string, answers: any) => client.post(\`/quiz/\${id}/submit\`, answers),
};`,

  'src/api/jobs.api.ts': `import client from './axios.client';
export const jobsApi = {
  getList: () => client.get('/jobs'),
  getDetail: (id: string) => client.get(\`/jobs/\${id}\`),
};`,

  // ── ZUSTAND GLOBAL STATE ──
  'src/store/auth.store.ts': `import { create } from 'zustand';
interface AuthState {
  token: string | null;
  user: any | null;
  setSession: (token: string, user: any) => void;
  clearSession: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => set({ token, user }),
  clearSession: () => set({ token: null, user: null }),
}));`,

  'src/store/ui.store.ts': `import { create } from 'zustand';
interface UIState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
}
export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));`,

  'src/store/interview.store.ts': `import { create } from 'zustand';
interface InterviewState {
  activeSessionId: string | null;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  setSessionId: (id: string | null) => void;
}
export const useInterviewStore = create<InterviewState>((set) => ({
  activeSessionId: null,
  currentQuestionIndex: 0,
  answers: {},
  setSessionId: (id) => set({ activeSessionId: id }),
}));`,

  'src/store/video.store.ts': `import { create } from 'zustand';
interface VideoState {
  postureScore: number;
  eyeContactScore: number;
}
export const useVideoStore = create<VideoState>(() => ({
  postureScore: 100,
  eyeContactScore: 100,
}));`,

  'src/store/quiz.store.ts': `import { create } from 'zustand';
interface QuizState {
  currentQuizId: string | null;
}
export const useQuizStore = create<QuizState>(() => ({
  currentQuizId: null,
}));`,

  // ── SHARED HOOKS ──
  'src/hooks/useAuth.ts': `import { useAuthStore } from '../store/auth.store';
export function useAuth() {
  const { user, token, setSession, clearSession } = useAuthStore();
  return { user, token, setSession, clearSession, isAuthenticated: !!token };
}`,

  'src/hooks/useWebSocket.ts': `import { useEffect } from 'react';
import { WebSocketClient } from '../api/websocket.client';
export function useWebSocket(url: string, onMessage: (msg: any) => void) {
  useEffect(() => {
    const ws = new WebSocketClient(url);
    ws.connect();
    return () => ws.disconnect();
  }, [url]);
}`,

  'src/hooks/useCountdown.ts': `import { useState, useEffect } from 'react';
export function useCountdown(initialSeconds: number, active: boolean) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);
  return seconds;
}`,

  'src/hooks/useDebounce.ts': `import { useState, useEffect } from 'react';
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}`,

  'src/hooks/useLocalStorage.ts': `import { useState } from 'react';
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = (value: T) => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };
  return [storedValue, setValue] as const;
}`,

  'src/hooks/useIntersectionObserver.ts': `import { useEffect, useRef } from 'react';
export function useIntersectionObserver(callback: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [callback]);
  return ref;
}`,

  'src/hooks/useMediaQuery.ts': `import { useState, useEffect } from 'react';
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}`,

  // ── UTILITIES ──
  'src/lib/utils.ts': `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}`,

  'src/lib/validators.ts': `import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});`,

  'src/lib/constants.ts': `export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';`,

  'src/lib/query-keys.ts': `export const queryKeys = {
  resumes: () => ['resumes'],
  jobs: () => ['jobs'],
  sessions: () => ['sessions'],
};`,

  'src/lib/score-utils.ts': `export function getScoreColor(score: number) {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-indigo-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}`,

  // ── GLOBAL TYPES ──
  'src/types/auth.types.ts': `export interface User {
  id: string;
  email: string;
  name: string;
}`,

  'src/types/resume.types.ts': `export interface Resume {
  id: string;
  name: string;
  atsScore: number;
}`,

  'src/types/interview.types.ts': `export interface Question {
  id: string;
  content: string;
}`,

  'src/types/video.types.ts': `export interface VideoMetrics {
  posture: number;
  gaze: number;
}`,

  'src/types/quiz.types.ts': `export interface Quiz {
  id: string;
  title: string;
}`,

  'src/types/jobs.types.ts': `export interface Job {
  id: string;
  title: string;
  company: string;
  matchScore: number;
}`,

  'src/types/api.types.ts': `export interface ApiResponse<T> {
  data: T;
  message: string;
}`,

  // ── SHARED CUSTOM COMPONENTS ──
  'src/components/custom/GradientCard.tsx': `export function GradientCard({ children, className = '' }: any) {
  return (
    <div className={\`p-6 bg-bg-surface border border-border-def rounded-xl relative overflow-hidden interactive-card \${className}\`}>
      {children}
    </div>
  );
}`,

  'src/components/custom/StatCard.tsx': `export function StatCard({ title, value, detail, color, icon }: any) {
  return (
    <div className="p-6 bg-bg-surface border border-border-def rounded-xl relative overflow-hidden interactive-card" style={{ borderTop: \`2px solid \${color}\` }}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">{title}</span>
        <span className="p-1.5 rounded-lg bg-bg-base border border-border-subtle shrink-0">{icon}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-mono font-extrabold text-text-prim leading-none">{value}</span>
        <span className="text-xs text-text-disabled">{detail}</span>
      </div>
    </div>
  );
}`,

  'src/components/custom/ScoreBadge.tsx': `export function ScoreBadge({ score }: { score: number }) {
  return (
    <span className="font-mono text-sm font-bold px-2 py-1 bg-bg-base border border-border-def rounded text-text-prim">
      {score}
    </span>
  );
}`,

  'src/components/custom/ModuleBadge.tsx': `export function ModuleBadge({ label, colorClass }: any) {
  return (
    <span className={\`px-2 py-0.5 font-mono text-[9px] uppercase font-bold rounded \${colorClass}\`}>
      {label}
    </span>
  );
}`,

  'src/components/custom/ScoreDonut.tsx': `export function ScoreDonut({ score, radius = 45 }: { score: number; radius?: number }) {
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative size-36 flex items-center justify-center select-none">
      <svg className="size-full transform -rotate-90">
        <circle cx="72" cy="72" r={radius} className="stroke-bg-muted" strokeWidth="10" fill="transparent" />
        <circle cx="72" cy="72" r={radius} className="stroke-sky-500 transition-all duration-1000" strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-extrabold text-text-prim leading-none">{score}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">out of 100</span>
      </div>
    </div>
  );
}`,

  'src/components/custom/RadarChart.tsx': `export function RadarChart() {
  return <div className="text-xs text-text-muted">[RadarChart Visualization]</div>;
}`,

  'src/components/custom/LineChart.tsx': `export function LineChart() {
  return <div className="text-xs text-text-muted">[LineChart Visualization]</div>;
}`,

  'src/components/custom/MatchGauge.tsx': `export function MatchGauge({ score }: { score: number }) {
  const radius = 40;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-36 h-20 flex items-end justify-center select-none overflow-hidden">
      <svg className="size-full transform rotate-180">
        <path d="M18,72 A54,54 0 0,1 126,72" className="stroke-bg-muted" strokeWidth="8" fill="transparent" />
        <circle cx="72" cy="72" r={radius} className="stroke-amber-500" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="font-mono text-2xl font-black text-text-prim leading-none">{score}%</span>
      </div>
    </div>
  );
}`,

  'src/components/custom/EmptyState.tsx': `export function EmptyState({ message }: { message: string }) {
  return <div className="text-center p-8 border border-dashed border-border-strong rounded-xl text-text-muted text-xs">{message}</div>;
}`,

  'src/components/custom/LoadingOverlay.tsx': `export function LoadingOverlay() {
  return <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">Loading...</div>;
}`,

  'src/components/custom/ShimmerSkeleton.tsx': `export function ShimmerSkeleton() {
  return <div className="w-full h-8 bg-bg-surface rounded shimmer" />;
}`,

  'src/components/custom/TimerChip.tsx': `export function TimerChip({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return <span className="px-3 py-1 font-mono text-xs font-bold bg-bg-surface border border-border-def rounded-full text-text-prim">{m}:{s}</span>;
}`,

  'src/components/custom/CoachTipChip.tsx': `export function CoachTipChip({ tip, onClose }: any) {
  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex justify-between items-center text-xs text-text-sec">
      <span>💡 {tip}</span>
      <button onClick={onClose} className="p-1">×</button>
    </div>
  );
}`,

  'src/components/custom/OtpInput.tsx': `export function OtpInput() {
  return <div className="flex gap-2">[OtpInput component]</div>;
}`,

  'src/components/custom/PasswordInput.tsx': `export function PasswordInput() {
  return <div className="relative">[PasswordInput component]</div>;
}`,

  'src/components/custom/FileDropzone.tsx': `export function FileDropzone() {
  return <div className="p-8 border border-dashed border-border-strong rounded-xl text-center">Drag and drop file</div>;
}`,

  'src/components/custom/ConfirmDialog.tsx': `export function ConfirmDialog() {
  return <div>[ConfirmDialog component]</div>;
}`,

  'src/components/custom/PodiumCard.tsx': `export function PodiumCard() {
  return <div>[PodiumCard component]</div>;
}`,

  // ── LAYOUT COMPONENTS ──
  'src/components/layout/RootLayout.tsx': `import { Outlet } from 'react-router-dom';
export function RootLayout() {
  return <Outlet />;
}`,

  'src/components/layout/AppLayout.tsx': `import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getTabColor = (pathname: string) => {
    if (pathname.includes('resumes')) return 'var(--color-resume)';
    if (pathname.includes('interview')) return 'var(--color-interview)';
    if (pathname.includes('video')) return 'var(--color-video)';
    if (pathname.includes('quiz')) return 'var(--color-quiz)';
    if (pathname.includes('jobs')) return 'var(--color-jobs)';
    if (pathname.includes('profile')) return 'var(--color-profile)';
    return 'var(--color-interview)';
  };

  const currentModuleColor = getTabColor(location.pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground relative w-full text-left">
      <div className="fixed pointer-events-none rounded-full blur-[120px] opacity-[0.08] w-[800px] h-[800px] -top-[200px] -right-[200px]" style={{ background: \`radial-gradient(circle, \${currentModuleColor} 0%, transparent 70%)\` }} />
      <aside className={\`hidden md:flex flex-col bg-bg-base border-r border-border-subtle transition-all duration-300 \${sidebarCollapsed ? 'w-16' : 'w-60'}\`}>
        <Link to="/" className="h-14 flex items-center px-4 border-b border-border-subtle gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shrink-0">M</div>
          {!sidebarCollapsed && <span className="font-heading font-bold text-lg text-text-prim font-sans">MockAI</span>}
        </Link>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {[
            { label: 'Dashboard', path: '/app/dashboard' },
            { label: 'Resumes', path: '/app/resumes' },
            { label: 'AI Interview', path: '/app/interview' },
            { label: 'Video Interview', path: '/app/video' },
            { label: 'Quiz', path: '/app/quiz' },
            { label: 'Browse Jobs', path: '/app/jobs' },
            { label: 'Profile', path: '/app/profile' }
          ].map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all \${isActive ? 'text-indigo-400 bg-indigo-500/5 border-l-[3px] border-indigo-500' : 'text-text-muted hover:text-text-prim hover:bg-bg-elevated'}\`}>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-14 bg-bg-base/80 backdrop-blur-md border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
          <span className="text-xs uppercase font-bold text-text-prim">MockAI / Dashboard</span>
          <button onClick={() => navigate('/')} className="px-3 py-1.5 bg-bg-surface border border-border-def rounded-lg text-xs hover:border-border-strong text-text-sec">Exit</button>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}`,

  'src/components/layout/Sidebar.tsx': `export function Sidebar() {
  return <div>[Sidebar component]</div>;
}`,

  'src/components/layout/Topbar.tsx': `export function Topbar() {
  return <div>[Topbar component]</div>;
}`,

  'src/components/layout/BottomBar.tsx': `export function BottomBar() {
  return <div>[BottomBar component]</div>;
}`,

  'src/components/layout/AuthLayout.tsx': `export function AuthLayout() {
  return <div>[AuthLayout component]</div>;
}`,

  // ── FEATURE: AUTH ──
  'src/features/auth/pages/LoginPage.tsx': `export function LoginPage() {
  return <div className="text-xs p-6">[LoginPage]</div>;
}`,

  'src/features/auth/pages/RegisterPage.tsx': `export function RegisterPage() {
  return <div className="text-xs p-6">[RegisterPage]</div>;
}`,

  'src/features/auth/pages/ForgotPasswordPage.tsx': `export function ForgotPasswordPage() {
  return <div className="text-xs p-6">[ForgotPasswordPage]</div>;
}`,

  'src/features/auth/pages/OtpVerificationPage.tsx': `export function OtpVerificationPage() {
  return <div className="text-xs p-6">[OtpVerificationPage]</div>;
}`,

  'src/features/auth/pages/SplashPage.tsx': `export function SplashPage() {
  return <div className="text-xs p-6">[SplashPage]</div>;
}`,

  'src/features/auth/components/LoginForm.tsx': `export function LoginForm() {
  return <div>[LoginForm]</div>;
}`,

  'src/features/auth/components/RegisterForm.tsx': `export function RegisterForm() {
  return <div>[RegisterForm]</div>;
}`,

  'src/features/auth/components/RoleSelector.tsx': `export function RoleSelector() {
  return <div>[RoleSelector]</div>;
}`,

  'src/features/auth/components/OnboardingSlider.tsx': `export function OnboardingSlider() {
  return <div>[OnboardingSlider]</div>;
}`,

  'src/features/auth/hooks/useAuthMutations.ts': `export function useAuthMutations() {
  return {};
}`,

  // ── FEATURE: HOME ──
  'src/features/home/pages/HomePage.tsx': `import { useNavigate } from 'react-router-dom';
import { StatCard } from '../../../components/custom/StatCard';

export function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8 text-left animate-fade-in duration-300">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-text-prim">Good morning, Alex 👋</h1>
        <p className="text-text-sec text-sm mt-1">Ready for your AI interview preparation session? Let's check your stats.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard title="Total Sessions" value="24" detail="↑ 3 this week" color="var(--color-resume)" />
        <StatCard title="Avg Score" value="78%" detail="This month" color="var(--color-interview)" />
        <StatCard title="Day Streak" value="🔥 12" detail="Days in a row" color="var(--color-sessions)" />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-heading font-bold text-text-prim">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { title: 'AI Interview Practice', desc: 'Surgical mock tech session with real-time feedback.', btn: 'Start Interview →', color: 'var(--color-interview)', border: 'rgba(99,102,241,0.2)', bgTint: 'rgba(99,102,241,0.06)', path: '/app/interview' },
            { title: '🎥 Video Interview', desc: 'Real-time eye contact, posture, and speech pacing analytics.', btn: 'Start Practice →', color: 'var(--color-video)', border: 'rgba(139,92,246,0.2)', bgTint: 'rgba(139,92,246,0.06)', path: '/app/video' },
            { title: '🧩 Take a Quick Quiz', desc: 'Test your conceptual software engineering depth.', btn: 'Take Quiz →', color: 'var(--color-quiz)', border: 'rgba(16,185,129,0.2)', bgTint: 'rgba(16,185,129,0.06)', path: '/app/quiz' },
            { title: '💼 Matched Jobs', desc: 'See real software engineer listings optimized for your profile.', btn: 'Browse Jobs →', color: 'var(--color-jobs)', border: 'rgba(245,158,11,0.2)', bgTint: 'rgba(245,158,11,0.06)', path: '/app/jobs' }
          ].map((action, i) => (
            <div 
              key={i}
              onClick={() => navigate(action.path)}
              className="p-6 bg-bg-surface border border-border-def hover:border-border-strong rounded-xl cursor-pointer relative overflow-hidden interactive-card"
              style={{ borderTop: \`2px solid \${action.color}\` }}
            >
              <h3 className="text-base font-heading font-semibold text-text-prim">{action.title}</h3>
              <p className="text-text-sec text-xs mt-1.5">{action.desc}</p>
              <div className="mt-6 flex items-center justify-end">
                <span className="text-xs font-semibold hover:underline" style={{ color: action.color }}>{action.btn}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,

  'src/features/home/components/WelcomeHeader.tsx': `export function WelcomeHeader() {
  return <div>[WelcomeHeader]</div>;
}`,

  'src/features/home/components/StatsRow.tsx': `export function StatsRow() {
  return <div>[StatsRow]</div>;
}`,

  'src/features/home/components/QuickActionsGrid.tsx': `export function QuickActionsGrid() {
  return <div>[QuickActionsGrid]</div>;
}`,

  'src/features/home/components/RecentSessionsList.tsx': `export function RecentSessionsList() {
  return <div>[RecentSessionsList]</div>;
}`,

  'src/features/home/components/JobHighlightCarousel.tsx': `export function JobHighlightCarousel() {
  return <div>[JobHighlightCarousel]</div>;
}`,

  // ── FEATURE: RESUME ──
  'src/features/resume/pages/ResumeListPage.tsx': `export function ResumeListPage() {
  return <div>[ResumeListPage]</div>;
}`,

  'src/features/resume/pages/ResumeUploadPage.tsx': `export function ResumeUploadPage() {
  return <div>[ResumeUploadPage]</div>;
}`,

  'src/features/resume/pages/ResumeDetailPage.tsx': `export function ResumeDetailPage() {
  return <div>[ResumeDetailPage]</div>;
}`,

  'src/features/resume/pages/ResumeAnalysisPage.tsx': `export function ResumeAnalysisPage() {
  return <div>[ResumeAnalysisPage]</div>;
}`,

  'src/features/resume/components/ResumeCard.tsx': `export function ResumeCard() {
  return <div>[ResumeCard]</div>;
}`,

  'src/features/resume/components/UploadProgress.tsx': `export function UploadProgress() {
  return <div>[UploadProgress]</div>;
}`,

  'src/features/resume/components/ParseStatusStepper.tsx': `export function ParseStatusStepper() {
  return <div>[ParseStatusStepper]</div>;
}`,

  'src/features/resume/components/AtsScorePanel.tsx': `export function AtsScorePanel() {
  return <div>[AtsScorePanel]</div>;
}`,

  'src/features/resume/components/SectionsAccordion.tsx': `export function SectionsAccordion() {
  return <div>[SectionsAccordion]</div>;
}`,

  'src/features/resume/components/SkillsGrid.tsx': `export function SkillsGrid() {
  return <div>[SkillsGrid]</div>;
}`,

  'src/features/resume/components/AnalysisStrengths.tsx': `export function AnalysisStrengths() {
  return <div>[AnalysisStrengths]</div>;
}`,

  'src/features/resume/components/AnalysisGaps.tsx': `export function AnalysisGaps() {
  return <div>[AnalysisGaps]</div>;
}`,

  'src/features/resume/components/ImprovementSuggestions.tsx': `export function ImprovementSuggestions() {
  return <div>[ImprovementSuggestions]</div>;
}`,

  'src/features/resume/hooks/useResumeQueries.ts': `export function useResumeQueries() {
  return {};
}`,

  'src/features/resume/hooks/useParseStatusPolling.ts': `export function useParseStatusPolling() {
  return {};
}`,

  // ── FEATURE: INTERVIEW ──
  'src/features/interview/pages/InterviewSetupPage.tsx': `export function InterviewSetupPage() {
  return <div>[InterviewSetupPage]</div>;
}`,

  'src/features/interview/pages/InterviewSessionPage.tsx': `export function InterviewSessionPage() {
  return <div>[InterviewSessionPage]</div>;
}`,

  'src/features/interview/pages/InterviewReportPage.tsx': `export function InterviewReportPage() {
  return <div>[InterviewReportPage]</div>;
}`,

  'src/features/interview/pages/QuestionBankPage.tsx': `export function QuestionBankPage() {
  return <div>[QuestionBankPage]</div>;
}`,

  'src/features/interview/components/SessionSetupForm.tsx': `export function SessionSetupForm() {
  return <div>[SessionSetupForm]</div>;
}`,

  'src/features/interview/components/QuestionCard.tsx': `export function QuestionCard() {
  return <div>[QuestionCard]</div>;
}`,

  'src/features/interview/components/AnswerTextarea.tsx': `export function AnswerTextarea() {
  return <div>[AnswerTextarea]</div>;
}`,

  'src/features/interview/components/HintPanel.tsx': `export function HintPanel() {
  return <div>[HintPanel]</div>;
}`,

  'src/features/interview/components/FeedbackSheet.tsx': `export function FeedbackSheet() {
  return <div>[FeedbackSheet]</div>;
}`,

  'src/features/interview/components/SessionProgressBar.tsx': `export function SessionProgressBar() {
  return <div>[SessionProgressBar]</div>;
}`,

  'src/features/interview/components/DifficultySlider.tsx': `export function DifficultySlider() {
  return <div>[DifficultySlider]</div>;
}`,

  'src/features/interview/components/ReportHeroCard.tsx': `export function ReportHeroCard() {
  return <div>[ReportHeroCard]</div>;
}`,

  'src/features/interview/components/RadarScoreChart.tsx': `export function RadarScoreChart() {
  return <div>[RadarScoreChart]</div>;
}`,

  'src/features/interview/components/QuestionAccordion.tsx': `export function QuestionAccordion() {
  return <div>[QuestionAccordion]</div>;
}`,

  'src/features/interview/hooks/useInterviewSession.ts': `export function useInterviewSession() {
  return {};
}`,

  'src/features/interview/hooks/useInterviewWebSocket.ts': `export function useInterviewWebSocket() {
  return {};
}`,

  // ── FEATURE: VIDEO ──
  'src/features/video/pages/VideoSetupPage.tsx': `export function VideoSetupPage() {
  return <div>[VideoSetupPage]</div>;
}`,

  'src/features/video/pages/VideoInterviewPage.tsx': `export function VideoInterviewPage() {
  return <div>[VideoInterviewPage]</div>;
}`,

  'src/features/video/pages/VideoReportPage.tsx': `export function VideoReportPage() {
  return <div>[VideoReportPage]</div>;
}`,

  'src/features/video/pages/VideoPlaybackPage.tsx': `export function VideoPlaybackPage() {
  return <div>[VideoPlaybackPage]</div>;
}`,

  'src/features/video/components/CameraPreview.tsx': `export function CameraPreview() {
  return <div>[CameraPreview]</div>;
}`,

  'src/features/video/components/MetricsSidebar.tsx': `export function MetricsSidebar() {
  return <div>[MetricsSidebar]</div>;
}`,

  'src/features/video/components/PostureBar.tsx': `export function PostureBar() {
  return <div>[PostureBar]</div>;
}`,

  'src/features/video/components/GazeBar.tsx': `export function GazeBar() {
  return <div>[GazeBar]</div>;
}`,

  'src/features/video/components/EmotionIndicator.tsx': `export function EmotionIndicator() {
  return <div>[EmotionIndicator]</div>;
}`,

  'src/features/video/components/MicFab.tsx': `export function MicFab() {
  return <div>[MicFab]</div>;
}`,

  'src/features/video/components/VideoReportTabs.tsx': `export function VideoReportTabs() {
  return <div>[VideoReportTabs]</div>;
}`,

  'src/features/video/components/PostureTimeline.tsx': `export function PostureTimeline() {
  return <div>[PostureTimeline]</div>;
}`,

  'src/features/video/components/EmotionHeatmap.tsx': `export function EmotionHeatmap() {
  return <div>[EmotionHeatmap]</div>;
}`,

  'src/features/video/components/SpeechReport.tsx': `export function SpeechReport() {
  return <div>[SpeechReport]</div>;
}`,

  'src/features/video/components/VideoPlayer.tsx': `export function VideoPlayer() {
  return <div>[VideoPlayer]</div>;
}`,

  'src/features/video/hooks/useVideoSession.ts': `export function useVideoSession() {
  return {};
}`,

  'src/features/video/hooks/useVideoWebSocket.ts': `export function useVideoWebSocket() {
  return {};
}`,

  'src/features/video/hooks/useMediaStream.ts': `export function useMediaStream() {
  return {};
}`,

  // ── FEATURE: SESSIONS ──
  'src/features/sessions/pages/SessionHistoryPage.tsx': `export function SessionHistoryPage() {
  return <div>[SessionHistoryPage]</div>;
}`,

  'src/features/sessions/pages/SessionDetailPage.tsx': `export function SessionDetailPage() {
  return <div>[SessionDetailPage]</div>;
}`,

  'src/features/sessions/pages/ProgressPage.tsx': `export function ProgressPage() {
  return <div>[ProgressPage]</div>;
}`,

  'src/features/sessions/components/SessionCard.tsx': `export function SessionCard() {
  return <div>[SessionCard]</div>;
}`,

  'src/features/sessions/components/SessionFilters.tsx': `export function SessionFilters() {
  return <div>[SessionFilters]</div>;
}`,

  'src/features/sessions/components/ScoreRadarPanel.tsx': `export function ScoreRadarPanel() {
  return <div>[ScoreRadarPanel]</div>;
}`,

  'src/features/sessions/components/ImprovementChecklist.tsx': `export function ImprovementChecklist() {
  return <div>[ImprovementChecklist]</div>;
}`,

  'src/features/sessions/components/ProgressLineChart.tsx': `export function ProgressLineChart() {
  return <div>[ProgressLineChart]</div>;
}`,

  'src/features/sessions/components/StreakCard.tsx': `export function StreakCard() {
  return <div>[StreakCard]</div>;
}`,

  'src/features/sessions/components/WeakAreasList.tsx': `export function WeakAreasList() {
  return <div>[WeakAreasList]</div>;
}`,

  'src/features/sessions/components/StrengthsList.tsx': `export function StrengthsList() {
  return <div>[StrengthsList]</div>;
}`,

  'src/features/sessions/hooks/useSessionQueries.ts': `export function useSessionQueries() {
  return {};
}`,

  // ── FEATURE: QUIZ ──
  'src/features/quiz/pages/QuizHomePage.tsx': `export function QuizHomePage() {
  return <div>[QuizHomePage]</div>;
}`,

  'src/features/quiz/pages/QuizDetailPage.tsx': `export function QuizDetailPage() {
  return <div>[QuizDetailPage]</div>;
}`,

  'src/features/quiz/pages/QuizAttemptPage.tsx': `export function QuizAttemptPage() {
  return <div>[QuizAttemptPage]</div>;
}`,

  'src/features/quiz/pages/QuizResultPage.tsx': `export function QuizResultPage() {
  return <div>[QuizResultPage]</div>;
}`,

  'src/features/quiz/pages/LeaderboardPage.tsx': `export function LeaderboardPage() {
  return <div>[LeaderboardPage]</div>;
}`,

  'src/features/quiz/components/QuizCard.tsx': `export function QuizCard() {
  return <div>[QuizCard]</div>;
}`,

  'src/features/quiz/components/QuizOptionButton.tsx': `export function QuizOptionButton() {
  return <div>[QuizOptionButton]</div>;
}`,

  'src/features/quiz/components/QuizTimerBar.tsx': `export function QuizTimerBar() {
  return <div>[QuizTimerBar]</div>;
}`,

  'src/features/quiz/components/QuizResultDonut.tsx': `export function QuizResultDonut() {
  return <div>[QuizResultDonut]</div>;
}`,

  'src/features/quiz/components/QuizReviewAccordion.tsx': `export function QuizReviewAccordion() {
  return <div>[QuizReviewAccordion]</div>;
}`,

  'src/features/quiz/components/LeaderboardTable.tsx': `export function LeaderboardTable() {
  return <div>[LeaderboardTable]</div>;
}`,

  'src/features/quiz/components/PodiumDisplay.tsx': `export function PodiumDisplay() {
  return <div>[PodiumDisplay]</div>;
}`,

  'src/features/quiz/hooks/useQuizAttempt.ts': `export function useQuizAttempt() {
  return {};
}`,

  'src/features/quiz/hooks/useQuizWebSocket.ts': `export function useQuizWebSocket() {
  return {};
}`,

  // ── FEATURE: JOBS ──
  'src/features/jobs/pages/JobsPage.tsx': `export function JobsPage() {
  return <div>[JobsPage]</div>;
}`,

  'src/features/jobs/pages/JobDetailPage.tsx': `export function JobDetailPage() {
  return <div>[JobDetailPage]</div>;
}`,

  'src/features/jobs/pages/SavedJobsPage.tsx': `export function SavedJobsPage() {
  return <div>[SavedJobsPage]</div>;
}`,

  'src/features/jobs/components/JobCard.tsx': `export function JobCard() {
  return <div>[JobCard]</div>;
}`,

  'src/features/jobs/components/JobSearchBar.tsx': `export function JobSearchBar() {
  return <div>[JobSearchBar]</div>;
}`,

  'src/features/jobs/components/JobFilters.tsx': `export function JobFilters() {
  return <div>[JobFilters]</div>;
}`,

  'src/features/jobs/components/MatchGaugePanel.tsx': `export function MatchGaugePanel() {
  return <div>[MatchGaugePanel]</div>;
}`,

  'src/features/jobs/components/SkillMatchChips.tsx': `export function SkillMatchChips() {
  return <div>[SkillMatchChips]</div>;
}`,

  'src/features/jobs/components/JobDescriptionExpander.tsx': `export function JobDescriptionExpander() {
  return <div>[JobDescriptionExpander]</div>;
}`,

  'src/features/jobs/hooks/useJobQueries.ts': `export function useJobQueries() {
  return {};
}`,

  // ── FEATURE: PROFILE ──
  'src/features/profile/pages/ProfilePage.tsx': `export function ProfilePage() {
  return <div>[ProfilePage]</div>;
}`,

  'src/features/profile/pages/SettingsPage.tsx': `export function SettingsPage() {
  return <div>[SettingsPage]</div>;
}`,

  'src/features/profile/components/ProfileHeader.tsx': `export function ProfileHeader() {
  return <div>[ProfileHeader]</div>;
}`,

  'src/features/profile/components/AchievementGrid.tsx': `export function AchievementGrid() {
  return <div>[AchievementGrid]</div>;
}`,

  'src/features/profile/components/NotificationSettings.tsx': `export function NotificationSettings() {
  return <div>[NotificationSettings]</div>;
}`,

  'src/features/profile/components/SecuritySettings.tsx': `export function SecuritySettings() {
  return <div>[SecuritySettings]</div>;
}`,

  'src/features/profile/hooks/useProfileMutations.ts': `export function useProfileMutations() {
  return {};
}`
};

// Create folders and files
const basePath = 'e:/MocrAI/web';

Object.entries(files).forEach(([fileRelPath, content]) => {
  const filePath = path.join(basePath, fileRelPath);
  const dirPath = path.dirname(filePath);
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Created:', fileRelPath);
});

console.log('Finished generating structure.');
