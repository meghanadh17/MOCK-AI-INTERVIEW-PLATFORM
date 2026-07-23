import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteSessionHistory, useShareSessionMutation } from '../hooks/useSessionQueries';
import { SessionFilters } from '../components/SessionFilters';
import { SessionCard } from '../components/SessionCard';
import { SessionDetailPanel } from '../components/SessionDetailPanel';
import { Sparkles, Calendar, TrendingUp, Inbox, AlertTriangle, Loader2, ArrowLeft, Award } from 'lucide-react';
import { toast } from 'sonner';

export function SessionHistoryPage() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  
  // Split-screen states
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [mobileShowDetails, setMobileShowDetails] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  const shareMutation = useShareSessionMutation();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = useInfiniteSessionHistory(15);

  // Setup infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten page results
  const allSessions = data?.pages.flatMap((page) => page) || [];

  // Client-side filtering & sorting
  const filteredSessions = allSessions
    .filter((session) => {
      const matchesType = typeFilter === 'all' || session.type === typeFilter;
      const matchesRole =
        roleFilter === '' ||
        session.title.toLowerCase().includes(roleFilter.toLowerCase());
      return matchesType && matchesRole;
    })
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOrder === 'highest') {
        return b.grade - a.grade;
      }
      if (sortOrder === 'lowest') {
        return a.grade - b.grade;
      }
      return 0;
    });

  // Auto-select first session if none is selected
  useEffect(() => {
    if (!selectedSessionId && filteredSessions.length > 0) {
      setSelectedSessionId(filteredSessions[0].id);
    }
  }, [filteredSessions, selectedSessionId]);

  const handleCardClick = (session: any) => {
    setSelectedSessionId(session.id);
    setMobileShowDetails(true);
  };

  const handleShare = async (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    try {
      const res = await shareMutation.mutateAsync({ id: session.id });
      navigator.clipboard.writeText(res.share_url);
      toast.success('Public share link copied to clipboard!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate share link.');
    }
  };

  const handleDelete = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    toast.info('Delete action placeholder triggered for session ' + session.id);
  };

  return (
    <div className="space-y-6 text-left pb-12 select-none">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-prim flex items-center gap-2">
            <Calendar className="size-5.5 text-zinc-400" />
            Practice Session History
          </h1>
          <p className="text-[10px] text-text-muted mt-1 uppercase font-mono tracking-wider">
            Telemetry Dashboard & Practice Records
          </p>
        </div>
        
        {/* Navigation buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/app/quiz?tab=history')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-prim bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-lg shadow-[3px_3px_8px_rgba(0,0,0,0.4)] transition-all cursor-pointer"
          >
            <Award className="size-4 text-indigo-400" />
            View Quiz Taken History
          </button>
          
          <button
            onClick={() => navigate('/app/sessions/progress')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-text-prim bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded-lg shadow-[3px_3px_8px_rgba(0,0,0,0.4)] transition-all cursor-pointer"
          >
            <TrendingUp className="size-4 text-zinc-400" />
            View Analytics & Progress
          </button>
        </div>
      </div>

      {/* Main Responsive Split Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: History Feed (col-span-5) */}
        <div className={`lg:col-span-5 space-y-4 ${mobileShowDetails ? 'hidden lg:block' : 'block'}`}>
          {/* Filters (Sharp Borders) */}
          <SessionFilters
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
          />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-zinc-800 bg-zinc-900/40 rounded-xl shadow-[6px_6px_16px_rgba(0,0,0,0.5)]">
              <Loader2 className="size-7 text-zinc-400 animate-spin" />
              <p className="text-xs text-text-muted">Loading your practice sessions...</p>
            </div>
          ) : isError ? (
            <div className="p-8 bg-zinc-900/40 border border-red-950/40 flex flex-col items-center text-center gap-4 rounded-xl shadow-[6px_6px_16px_rgba(0,0,0,0.5)]">
              <AlertTriangle className="size-8 text-red-500" />
              <div>
                <h3 className="text-xs font-bold text-text-prim">Error Loading History</h3>
                <p className="text-[10px] text-text-muted mt-1">
                  There was an issue fetching your session records.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-950/50 hover:bg-red-950 border border-red-800 text-red-400 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                Retry
              </button>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-10 bg-zinc-900/40 border border-zinc-800 flex flex-col items-center text-center gap-4 rounded-xl shadow-[6px_6px_16px_rgba(0,0,0,0.5)]">
              <Inbox className="size-8 text-text-muted" />
              <div>
                <h3 className="text-xs font-bold text-text-prim">No Sessions Found</h3>
                <p className="text-[10px] text-text-muted mt-1">
                  {allSessions.length === 0
                    ? "You haven't completed any practice sessions yet."
                    : "No sessions match your active filters."}
                </p>
              </div>
              {allSessions.length === 0 && (
                <button
                  onClick={() => navigate('/app/interview')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-950 font-bold text-xs shadow-[3px_3px_10px_rgba(255,255,255,0.05)] rounded-lg cursor-pointer transition-all duration-200"
                >
                  <Sparkles className="size-3.5" />
                  Start Practice
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-text-muted font-mono px-1">
                <span>{filteredSessions.length} sessions</span>
                <span>Select to view scorecard</span>
              </div>

              <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onClick={() => handleCardClick(session)}
                    onShare={(e) => handleShare(e, session)}
                    onDelete={(e) => handleDelete(e, session)}
                    isSelected={selectedSessionId === session.id}
                  />
                ))}
              </div>

              {/* Observer Loader */}
              <div ref={observerTarget} className="h-8 flex items-center justify-center">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <Loader2 className="size-3.5 animate-spin text-zinc-400" />
                    Loading more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Selected Session Scorecard (col-span-7) */}
        <div className={`lg:col-span-7 space-y-4 ${mobileShowDetails ? 'block' : 'hidden lg:block'}`}>
          {selectedSessionId ? (
            <div className="space-y-3">
              {/* Mobile back navigation bar */}
              <div className="lg:hidden flex items-center gap-2 pb-1.5 border-b border-zinc-800/50">
                <button
                  onClick={() => setMobileShowDetails(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-text-prim text-text-muted text-[10px] font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to List
                </button>
                <span className="text-[10px] text-text-muted font-mono">Detail View</span>
              </div>

              <SessionDetailPanel sessionId={selectedSessionId} />
            </div>
          ) : (
            <div className="h-[400px] border border-zinc-800 border-dashed bg-zinc-900/20 flex flex-col items-center justify-center text-center p-6 rounded-xl shadow-sm">
              <Inbox className="size-8 text-text-muted mb-2" />
              <h3 className="text-xs font-bold text-text-prim">No Session Selected</h3>
              <p className="text-[10px] text-text-muted mt-1">
                Select a mock interview or video practice session from the list to view its performance dashboard.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}