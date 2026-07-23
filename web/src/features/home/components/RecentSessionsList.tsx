import { useNavigate } from 'react-router-dom';
import { useSessionHistoryQuery } from '@/features/sessions/hooks/useSessionQueries';
import { SessionCard } from '@/features/sessions/components/SessionCard';
import { Skeleton } from '@/components/ui/skeleton';
import { History, ArrowRight } from 'lucide-react';

export function RecentSessionsList() {
  const navigate = useNavigate();
  const { data: history, isLoading } = useSessionHistoryQuery(5);

  if (isLoading) {
    return (
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32 bg-bg-elevated" />
          <Skeleton className="h-4 w-16 bg-bg-elevated" />
        </div>
        <div className="bg-bg-surface border border-border-def rounded-xl overflow-hidden divide-y divide-border-subtle">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 flex-1">
                <Skeleton className="size-10 rounded-xl bg-bg-elevated shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2 bg-bg-elevated" />
                  <Skeleton className="h-3 w-1/3 bg-bg-elevated" />
                </div>
              </div>
              <Skeleton className="h-7 w-10 bg-bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sessions = history?.slice(0, 5) || [];

  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-heading font-bold text-text-prim flex items-center gap-2">
          <History className="size-4.5 text-text-muted" />
          Recent Sessions
        </h2>
        {sessions.length > 0 && (
          <button 
            onClick={() => navigate('/app/sessions')} 
            className="text-xs font-semibold text-text-sec hover:text-text-prim hover:underline flex items-center gap-1 cursor-pointer"
          >
            View all
            <ArrowRight className="size-3" />
          </button>
        )}
      </div>

      <div className="neo-sunken p-3.5 flex flex-col gap-3.5 border border-zinc-900/60 rounded-2xl overflow-hidden">
        {sessions.length > 0 ? (
          sessions.map((session: any) => (
            <SessionCard 
              key={session.id}
              session={session}
              onClick={() => {
                if (session.type === 'video') {
                  navigate(`/app/video/${session.id}/report`);
                } else {
                  navigate(`/app/interview/${session.id}/report`);
                }
              }}
            />
          ))
        ) : (
          <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center">
            <p className="text-xs">No recent mock sessions found.</p>
            <button 
              onClick={() => navigate('/app/interview')}
              className="mt-4 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-200 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer text-center hover:scale-105 active:scale-95 shadow-md"
            >
              Start your first practice session →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}