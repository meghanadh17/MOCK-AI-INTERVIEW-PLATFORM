import { useNavigate } from 'react-router-dom';
import { 
  useSessionStreakQuery, 
  useSessionProgressQuery, 
  useSessionWeakAreasQuery, 
  useSessionStrengthsQuery 
} from '../hooks/useSessionQueries';
import { StreakCard } from '../components/StreakCard';
import { ProgressLineChart } from '../components/ProgressLineChart';
import { WeakAreasList } from '../components/WeakAreasList';
import { StrengthsList } from '../components/StrengthsList';
import { 
  TrendingUp, 
  ChevronRight, 
  GraduationCap, 
  Loader2,
  CalendarRange
} from 'lucide-react';

export function ProgressPage() {
  const navigate = useNavigate();

  const streakQuery = useSessionStreakQuery();
  const progressQuery = useSessionProgressQuery();
  const weakAreasQuery = useSessionWeakAreasQuery();
  const strengthsQuery = useSessionStrengthsQuery();

  const isLoading = 
    streakQuery.isLoading || 
    progressQuery.isLoading || 
    weakAreasQuery.isLoading || 
    strengthsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="size-8 text-zinc-400 animate-spin" />
        <p className="text-xs text-text-muted">Aggregating historical scores and generating progress dashboard analytics...</p>
      </div>
    );
  }

  const streakData = streakQuery.data;
  const progressData = progressQuery.data || [];
  const weakAreasData = weakAreasQuery.data || [];
  const strengthsData = strengthsQuery.data || [];

  return (
    <div className="space-y-6 text-left pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-prim flex items-center gap-2">
            <TrendingUp className="size-6 text-zinc-450" />
            Performance & Progress Analytics
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Track your mock practice frequency, rolling skill competencies, strengths, and personalized recommendations.
          </p>
        </div>

        {/* Back to Sessions list */}
        <button
          onClick={() => navigate('/app/sessions')}
          className="flex items-center gap-1.5 px-4.5 py-2.5 text-xs font-semibold text-text-prim bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-750 hover:to-zinc-850 border border-zinc-700/85 hover:border-zinc-500 hover:text-white rounded-lg shadow-[4px_4px_10px_rgba(0,0,0,0.45),-2px_-2px_8px_rgba(255,255,255,0.01)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
        >
          View Practice History
          <ChevronRight className="size-4 text-zinc-450" />
        </button>
      </div>

      {/* Main Split-Screen Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Visual Progress & Streak (col-span-8) */}
        <div className="lg:col-span-8 space-y-5 flex flex-col">
          {/* Streak Card */}
          <StreakCard streakData={streakData} />
          
          {/* Progress Area Chart */}
          <ProgressLineChart data={progressData} />

          {/* Top Strengths card */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.015)] rounded-xl space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Top Competencies (Strengths)</h3>
              <p className="text-[10px] text-text-muted uppercase font-mono mt-0.5">Categories with high ratings</p>
            </div>
            <StrengthsList strengths={strengthsData} />
          </div>
        </div>

        {/* RIGHT COLUMN: Milestones & Weaknesses (col-span-4) */}
        <div className="lg:col-span-4 space-y-5 flex flex-col">
          
          {/* 30-Day recommended study plan summary */}
          <div className="p-5 bg-zinc-900 border border-zinc-800 shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.015)] rounded-xl flex flex-col justify-between gap-5 text-left">
            <div>
              <div className="flex items-center gap-2">
                <CalendarRange className="size-5 text-zinc-450" />
                <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">30-Day Study Plan</h3>
              </div>
              <p className="text-[10px] text-text-muted uppercase font-mono mt-0.5">Recommended practice milestones</p>
              
              <div className="space-y-3.5 mt-5">
                <div className="flex gap-3">
                  <span className="size-5.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-350 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 shadow-inner">W1</span>
                  <div>
                    <h4 className="text-xs font-bold text-text-prim">Core Foundations</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">Focus on basic system trade-offs and structural answer templates (STAR method).</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="size-5.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-350 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 shadow-inner">W2</span>
                  <div>
                    <h4 className="text-xs font-bold text-text-prim">Telemetry Practice</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">Record video practice sessions focusing on minimizing filler words and static postures.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="size-5.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-350 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 shadow-inner">W3</span>
                  <div>
                    <h4 className="text-xs font-bold text-text-prim">Advanced Scenarios</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">Deepen algorithm explanations, load balancing, databases, and architectural scaling topics.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/app/interview')}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-750 hover:to-zinc-850 text-zinc-300 hover:text-zinc-100 border border-zinc-700/80 hover:border-zinc-500 font-extrabold text-xs rounded-lg shadow-[4px_4px_12px_rgba(0,0,0,0.5),-2px_-2px_8px_rgba(255,255,255,0.01)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <GraduationCap className="size-4" />
              Launch Mock Setup Form
            </button>
          </div>

          {/* Top Weak Areas card */}
          <div className="p-6 bg-zinc-900 border border-zinc-800 shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.015)] rounded-xl space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">Focus Areas (Weaknesses)</h3>
              <p className="text-[10px] text-text-muted uppercase font-mono mt-0.5">Topics requiring review and practice</p>
            </div>
            <WeakAreasList weakAreas={weakAreasData} />
          </div>

        </div>

      </div>
    </div>
  );
}