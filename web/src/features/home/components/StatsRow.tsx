import { Activity, Award, Flame } from 'lucide-react';
import { StatCard } from '@/components/custom/StatCard';
import { useSessionHistoryQuery, useSessionStreakQuery } from '@/features/sessions/hooks/useSessionQueries';
import { useUserProfileQuery } from '@/hooks/useAuthQueries';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsRow() {
  const { data: user, isLoading: userLoading } = useUserProfileQuery();
  const { data: history, isLoading: historyLoading } = useSessionHistoryQuery();
  const { data: streak, isLoading: streakLoading } = useSessionStreakQuery();

  const isLoading = userLoading || historyLoading || streakLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-bg-surface border border-border-def rounded-xl relative overflow-hidden h-28 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <Skeleton className="h-4 w-24 bg-bg-elevated" />
              <Skeleton className="size-8 rounded-lg bg-bg-elevated" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <Skeleton className="h-8 w-16 bg-bg-elevated" />
              <Skeleton className="h-3 w-20 bg-bg-elevated" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 1. Total Sessions (Interviews Taken)
  const totalSessions = user?.stats?.interviews_taken ?? history?.length ?? 0;
  const sessionsDetail = history && history.length > 0 
    ? `↑ ${history.filter((h: any) => {
        const diffTime = Math.abs(new Date().getTime() - new Date(h.created_at).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }).length} this week`
    : 'Ready to start';

  // 2. Average Score
  const validSessions = history?.filter((h: any) => h.grade !== undefined && h.grade !== null) || [];
  const avgScore = validSessions.length > 0
    ? Math.round(validSessions.reduce((sum: number, h: any) => sum + h.grade, 0) / validSessions.length)
    : 0;
  const scoreDetail = validSessions.length > 0 ? 'All-time average' : 'No scores yet';

  // 3. Day Streak
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const streakDetail = longestStreak > 0 ? `Personal best: ${longestStreak}d` : 'Start your streak!';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-6">
      <StatCard 
        title="Total Sessions"
        value={totalSessions.toString()}
        detail={sessionsDetail}
        icon={<Activity className="size-5 text-text-muted" />}
      />
      <StatCard 
        title="Avg Score"
        value={avgScore > 0 ? `${avgScore}%` : 'N/A'}
        detail={scoreDetail}
        icon={<Award className="size-5 text-text-muted" />}
      />
      <StatCard 
        title="Day Streak"
        value={`🔥 ${currentStreak}`}
        detail={streakDetail}
        icon={<Flame className="size-5 text-text-prim fill-text-prim/10 animate-pulse" />}
      />
    </div>
  );
}