import { useNavigate } from 'react-router-dom';
import { WelcomeHeader } from '../components/WelcomeHeader';
import { StatsRow } from '../components/StatsRow';
import { QuickActionsGrid } from '../components/QuickActionsGrid';
import { RecentSessionsList } from '../components/RecentSessionsList';
import { JobHighlightCarousel } from '../components/JobHighlightCarousel';
import { useUserProfileQuery } from '@/hooks/useAuthQueries';
import { Brain, Play, Sparkles, Trophy } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { data: user } = useUserProfileQuery();

  const roleName = user?.preferences?.role || user?.role || 'Software Engineer';
  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Developer';

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left relative z-10 pb-16 font-sans">
      {/* 1. Welcome Header Section */}
      <WelcomeHeader />

      {/* 2. Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT & CENTER COLUMNS - Main Activity Areas */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Career Track Hero Banner */}
          <div className="p-6 neo-raised neo-raised-hover rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group border border-zinc-900/60 shadow-[6px_6px_18px_rgba(0,0,0,0.7),-4px_-4px_14px_rgba(255,255,255,0.015)]">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.01] blur-2xl rounded-full pointer-events-none group-hover:bg-white/[0.02] transition-colors duration-300" />
            
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-900 text-zinc-400 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
                <Sparkles className="size-3 text-zinc-300 animate-pulse" />
                Active Career Track
              </div>
              <h2 className="text-xl font-heading font-extrabold text-zinc-100">
                Targeting {roleName} Roles
              </h2>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Welcome back, {firstName}. Based on your active resume, we have calibrated your mock assessment environments and job matching. Trigger a new mock practice interview to update your dashboard metrics.
              </p>
            </div>
            
            <button
              onClick={() => navigate('/app/interview')}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-3 rounded-xl text-xs font-bold font-heading shrink-0 cursor-pointer shadow-[3px_3px_8px_rgba(0,0,0,0.5)] transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Play className="size-3.5 fill-current" />
              Resume Mock Session
            </button>
          </div>

          {/* Quick Actions Grid Panel */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
                <Brain className="size-4.5 text-zinc-500" />
                Preparation Hub
              </h2>
            </div>
            <QuickActionsGrid />
          </div>

          {/* Job Highlight Carousel */}
          <JobHighlightCarousel />
        </div>

        {/* RIGHT COLUMN - Sidebar Analytics & Stats */}
        <div className="space-y-8">
          
          {/* Scoreboard Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-heading font-bold text-zinc-100 flex items-center gap-2">
              <Trophy className="size-4.5 text-zinc-500" />
              Scoreboard
            </h2>
            <StatsRow />
          </div>

          {/* Recent Sessions List */}
          <RecentSessionsList />
        </div>
      </div>
    </div>
  );
}