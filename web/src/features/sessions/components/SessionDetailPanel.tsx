import { useState } from 'react';
import { 
  useSessionSummaryQuery, 
  useSessionScoreBreakdownQuery, 
  useSessionImprovementsQuery, 
  useSessionComparisonQuery,
  useShareSessionMutation 
} from '../hooks/useSessionQueries';
import { ScoreRadarPanel } from './ScoreRadarPanel';
import { ImprovementChecklist } from './ImprovementChecklist';
import { Share2, Star, Target, Sparkles, Check, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

type ActiveTab = 'summary' | 'score' | 'improvements';

interface SessionDetailPanelProps {
  sessionId: string;
}

export function SessionDetailPanel({ sessionId }: SessionDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [copied, setCopied] = useState(false);

  const summaryQuery = useSessionSummaryQuery(sessionId);
  const scoreQuery = useSessionScoreBreakdownQuery(sessionId);
  const improvementsQuery = useSessionImprovementsQuery(sessionId);
  const comparisonQuery = useSessionComparisonQuery(sessionId);
  const shareMutation = useShareSessionMutation();

  const handleShare = async () => {
    try {
      const res = await shareMutation.mutateAsync({ id: sessionId });
      await navigator.clipboard.writeText(res.share_url);
      setCopied(true);
      toast.success('Public shareable report link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate share link.');
    }
  };

  const isLoading = 
    summaryQuery.isLoading || 
    scoreQuery.isLoading || 
    improvementsQuery.isLoading || 
    comparisonQuery.isLoading;

  const isError = 
    summaryQuery.isError || 
    scoreQuery.isError || 
    improvementsQuery.isError || 
    comparisonQuery.isError;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-3 border border-zinc-800 bg-zinc-900/40 text-center p-6 rounded-xl shadow-[6px_6px_16px_rgba(0,0,0,0.5)]">
        <Loader2 className="size-8 text-zinc-400 animate-spin" />
        <p className="text-xs text-text-muted">Analyzing session details and compiling telemetry reports...</p>
      </div>
    );
  }

  if (isError || !summaryQuery.data) {
    return (
      <div className="p-8 border border-red-950/40 bg-zinc-900/40 flex flex-col items-center text-center gap-4 max-w-lg mx-auto rounded-xl shadow-[6px_6px_16px_rgba(0,0,0,0.5)]">
        <ShieldAlert className="size-10 text-red-500" />
        <div>
          <h3 className="font-bold text-text-prim">Failed to Load Session Details</h3>
          <p className="text-xs text-text-muted mt-1">
            We couldn't retrieve the details for this practice session.
          </p>
        </div>
      </div>
    );
  }

  const summaryData = summaryQuery.data;
  const scoreData = scoreQuery.data;
  const improvementsData = improvementsQuery.data;
  const comparisonData = comparisonQuery.data;

  return (
    <div className="space-y-6 text-left border border-zinc-800/80 bg-zinc-900/60 p-6 rounded-xl shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.01)] backdrop-blur-md">
      {/* Title & Share Button Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
        <div>
          <h2 className="text-md font-bold text-text-prim flex items-center gap-2">
            Session Detailed Breakdown
          </h2>
          <p className="text-[10px] text-text-muted mt-0.5 font-mono">
            Session ID: {sessionId}
          </p>
        </div>

        <button
          onClick={handleShare}
          disabled={shareMutation.isPending}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-950 font-bold text-xs rounded-lg shadow-[3px_3px_10px_rgba(255,255,255,0.05)] cursor-pointer disabled:opacity-60 transition-all duration-200 shrink-0"
        >
          {shareMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : copied ? (
            <Check className="size-3.5" />
          ) : (
            <Share2 className="size-3.5" />
          )}
          {copied ? 'Link Copied!' : 'Share Report'}
        </button>
      </div>

      {/* Grid Layout: Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-zinc-950/50 border border-zinc-850 flex items-center gap-3 rounded-xl shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
          <div className="p-2 bg-zinc-800 border border-zinc-700/80 text-zinc-300 shrink-0 rounded-xl">
            <Star className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Performance Grade</span>
            <span className="text-md font-bold font-mono text-text-prim block mt-0.5">
              {summaryData.overall_performance_grade ? (Math.round(summaryData.overall_performance_grade * 10) / 10) : '75.0'}%
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-zinc-950/50 border border-zinc-850 flex items-center gap-3 rounded-xl shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0 rounded-xl">
            <Target className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Top Weakness</span>
            <span className="text-[10px] font-bold text-text-prim block mt-1 truncate max-w-[140px]" title={improvementsData.weaknesses?.[0]}>
              {improvementsData.weaknesses && improvementsData.weaknesses.length > 0 
                ? improvementsData.weaknesses[0] 
                : 'Structure & Cohesion'}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-zinc-950/50 border border-zinc-850 flex items-center gap-3 rounded-xl shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 rounded-xl">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Checklist Items</span>
            <span className="text-md font-bold font-mono text-text-prim block mt-0.5">
              {countChecklistItems(improvementsData)} tasks
            </span>
          </div>
        </div>
      </div>

      {/* Tabs list (Flat Sharp Neomorphic Styling) */}
      <div className="flex p-1 bg-zinc-950/60 rounded-xl w-full sm:max-w-xs border border-zinc-850">
        {(['summary', 'score', 'improvements'] as ActiveTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-[10px] font-bold capitalize rounded-lg cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-zinc-900 border border-zinc-800 text-white shadow-[2px_2px_6px_rgba(0,0,0,0.4)]'
                  : 'text-text-muted hover:text-text-prim'
              }`}
            >
              {tab === 'score' ? 'Score' : tab === 'improvements' ? 'Checklist' : tab}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Overview Narrative Card */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-850 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] rounded-xl space-y-4">
              <div>
                <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">AI Review Narrative</h3>
                <p className="text-[8px] text-text-muted uppercase font-mono mt-0.5">Performance Overview</p>
              </div>
              <p className="text-xs/relaxed text-text-sec whitespace-pre-wrap">
                {summaryData.summary || "No narrative evaluation generated for this session."}
              </p>
            </div>

            {/* What Went Well & What to Improve list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4.5 bg-zinc-950/40 border border-emerald-500/10 rounded-xl space-y-2.5 shadow-[4px_4px_12px_rgba(0,0,0,0.3)]">
                <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider block">What Went Well</span>
                <p className="text-xs/relaxed text-text-muted whitespace-pre-wrap">
                  {summaryData.what_went_well || "• Expressed core concepts clearly\n• Strong vocabulary choice"}
                </p>
              </div>

              <div className="p-4.5 bg-zinc-950/40 border border-zinc-800/80 rounded-xl space-y-2.5 shadow-[4px_4px_12px_rgba(0,0,0,0.3)]">
                <span className="text-[9px] font-extrabold text-zinc-350 uppercase tracking-wider block">Focus Improvement Areas</span>
                <p className="text-xs/relaxed text-text-muted whitespace-pre-wrap">
                  {summaryData.what_to_improve || "• Deepen description of architectures\n• Minimize vocal pauses"}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'score' && (
          <div className="space-y-4">
            {/* Radar chart breakdown */}
            <ScoreRadarPanel scores={scoreData} />

            {/* Rolling 30D Average comparison */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-850 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.4)] rounded-xl space-y-4">
              <div>
                <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Rolling Comparison</h3>
                <p className="text-[8px] text-text-muted uppercase font-mono mt-0.5">Current vs. 30-Day average</p>
              </div>

              {comparisonData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {(['technical', 'communication', 'confidence', 'structure', 'relevance'] as const).map((metric) => {
                    const currentVal = comparisonData.current_scores[metric];
                    const avgVal = comparisonData.rolling_30d_avg[metric];
                    const diff = comparisonData.difference[metric];
                    const isPositive = diff >= 0;

                    return (
                      <div key={metric} className="p-3 bg-zinc-950/40 border border-zinc-850/60 rounded-xl space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-prim capitalize">{metric}</span>
                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-lg ${
                            isPositive 
                              ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10' 
                              : 'bg-red-950/30 text-red-400 border border-red-500/10'
                          }`}>
                            {isPositive ? `+${diff}` : diff}%
                          </span>
                        </div>

                        {/* Dual Bar gauge */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[8px] text-text-muted font-mono">
                            <span>Current: {currentVal}%</span>
                            <span>Rolling Avg: {avgVal}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden relative">
                            {/* Avg line indicator marker */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-text-disabled z-10" 
                              style={{ left: `${avgVal}%` }}
                              title="Rolling Average"
                            />
                            {/* Current Score bar fill */}
                            <div 
                              className={`h-full rounded-full ${isPositive ? 'bg-zinc-100' : 'bg-zinc-400/60'}`}
                              style={{ width: `${currentVal}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-text-muted">No comparison statistics generated.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'improvements' && (
          <ImprovementChecklist sessionId={sessionId} improvements={improvementsData} />
        )}
      </div>
    </div>
  );
}

function countChecklistItems(improvements: any) {
  let count = 0;
  if (improvements.weaknesses) count += improvements.weaknesses.length;
  if (improvements.study_plan_30d) {
    Object.values(improvements.study_plan_30d).forEach((tasks: any) => {
      count += tasks.length;
    });
  }
  return count || 5;
}
