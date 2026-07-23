import { useState } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate 
} from 'react-router-dom';
import './App.css';

import { SplashPage } from './features/auth/pages/SplashPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { OtpVerificationPage } from './features/auth/pages/OtpVerificationPage';

import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './features/home/pages/HomePage';
import { ResumeListPage } from './features/resume/pages/ResumeListPage';
import { ResumeUploadPage } from './features/resume/pages/ResumeUploadPage';
import { ResumeDetailPage } from './features/resume/pages/ResumeDetailPage';
import { ResumeAnalysisPage } from './features/resume/pages/ResumeAnalysisPage';
import { InterviewSetupPage } from './features/interview/pages/InterviewSetupPage';
import { InterviewSessionPage } from './features/interview/pages/InterviewSessionPage';
import { InterviewReportPage } from './features/interview/pages/InterviewReportPage';
import { QuestionBankPage } from './features/interview/pages/QuestionBankPage';
import { VideoSetupPage } from './features/video/pages/VideoSetupPage';
import { VideoInterviewPage } from './features/video/pages/VideoInterviewPage';
import { VideoReportPage } from './features/video/pages/VideoReportPage';
import { VideoPlaybackPage } from './features/video/pages/VideoPlaybackPage';
import { QuizHomePage } from './features/quiz/pages/QuizHomePage';
import { QuizAttemptPage } from './features/quiz/pages/QuizAttemptPage';
import { QuizResultPage } from './features/quiz/pages/QuizResultPage';
import { LeaderboardPage } from './features/quiz/pages/LeaderboardPage';
import { JobsPage } from './features/jobs/pages/JobsPage';
import { JobDetailPage } from './features/jobs/pages/JobDetailPage';
import { SavedJobsPage } from './features/jobs/pages/SavedJobsPage';
import { ProfilePage } from './features/profile/pages/ProfilePage';
import { SessionHistoryPage } from './features/sessions/pages/SessionHistoryPage';
import { SessionDetailPage } from './features/sessions/pages/SessionDetailPage';
import { ProgressPage } from './features/sessions/pages/ProgressPage';
import { Toaster } from './components/ui/sonner';
import { OnboardingSlider } from './components/custom/OnboardingSlider';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('mocrai_onboarded');
  });

  return (
    <Router>
      <Toaster />
      {showOnboarding && <OnboardingSlider onClose={() => setShowOnboarding(false)} />}
      <Routes>
        {/* Landing Page at Path '/' */}
        <Route path="/" element={<SplashPage />} />
        
        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<OtpVerificationPage />} />
        
        {/* Application Layout at Path '/app' with nested child subroutes */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<HomePage />} />
          <Route path="resumes" element={<ResumeListPage />} />
          <Route path="resumes/upload" element={<ResumeUploadPage />} />
          <Route path="resumes/:id" element={<ResumeDetailPage />} />
          <Route path="resumes/:id/analysis" element={<ResumeAnalysisPage />} />
          
          {/* AI Interview Routes */}
          <Route path="interview" element={<InterviewSetupPage />} />
          <Route path="interview/bank" element={<QuestionBankPage />} />
          <Route path="interview/:id" element={<InterviewSessionPage />} />
          <Route path="interview/:id/report" element={<InterviewReportPage />} />
          
          <Route path="video" element={<VideoSetupPage />} />
          <Route path="video/:id" element={<VideoInterviewPage />} />
          <Route path="video/:id/report" element={<VideoReportPage />} />
          <Route path="video/:id/play" element={<VideoPlaybackPage />} />

          {/* Session Review Routes */}
          <Route path="sessions" element={<SessionHistoryPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="sessions/progress" element={<ProgressPage />} />

          <Route path="quiz" element={<QuizHomePage />} />
          <Route path="quiz/:id/attempt" element={<QuizAttemptPage />} />
          <Route path="quiz/:id/result/:attemptId" element={<QuizResultPage />} />
          <Route path="quiz/leaderboard" element={<LeaderboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/saved" element={<SavedJobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

