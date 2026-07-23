import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { quizApi } from '@/api/quiz.api';
import { PodiumDisplay } from '../components/PodiumDisplay';
import { LeaderboardTable } from '../components/LeaderboardTable';
import { Trophy, ArrowLeft, Loader2, Calendar, Earth, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type BoardScope = 'global' | 'weekly';

export function LeaderboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BoardScope>('global');

  // Queries
  const { data: globalData, isLoading: isGlobalLoading } = useQuery<any>({
    queryKey: ['leaderboard', 'global'],
    queryFn: quizApi.getLeaderboardGlobal
  });

  const { data: weeklyData, isLoading: isWeeklyLoading } = useQuery<any>({
    queryKey: ['leaderboard', 'weekly'],
    queryFn: quizApi.getLeaderboardWeekly
  });

  const { data: userRank, isLoading: isRankLoading } = useQuery<any>({
    queryKey: ['leaderboard-user-rank'],
    queryFn: quizApi.getLeaderboardUser
  });

  const isLoading = isGlobalLoading || isWeeklyLoading || isRankLoading;

  const getActiveList = () => {
    if (activeTab === 'global') return globalData?.leaderboard || [];
    return weeklyData?.leaderboard || [];
  };

  const getMyRankDetails = () => {
    if (!userRank) return { rank: null, score: null, percentile: 0 };
    if (activeTab === 'global') {
      return {
        rank: userRank.global_board?.rank || null,
        score: userRank.global_board?.score || 0,
        percentile: userRank.global_board?.percentile || 0
      };
    }
    return {
      rank: userRank.weekly_board?.rank || null,
      score: userRank.weekly_board?.score || 0,
      percentile: userRank.weekly_board?.percentile || 0
    };
  };

  const usersList = getActiveList();
  const myRankInfo = getMyRankDetails();

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16 select-none">
      {/* Header section */}
      <div className="flex items-center gap-4 border-b border-zinc-900 pb-5">
        <button
          onClick={() => navigate('/app/quiz')}
          className="relative group p-2.5 rounded-xl text-text-muted hover:text-text-prim cursor-pointer transition-all active:scale-[0.97] neo-raised neo-raised-hover neo-raised-active"
          title="Back to Arena"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text-prim flex items-center gap-2.5 font-heading uppercase">
            <Trophy className="size-5 text-indigo-400" />
            Arena Leaderboard & Standings
          </h1>
          <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider mt-1.5">
            Challenge peers and evaluate percentile standings
          </p>
        </div>
      </div>

      {/* Tabs list (Zinc Flat sharp Neomorphic buttons) */}
      <div className="relative flex p-1 rounded-2xl w-full sm:max-w-xs select-none neo-sunken">
        <button
          onClick={() => setActiveTab('global')}
          className={cn(
            'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
            activeTab === 'global'
              ? 'text-white neo-raised neo-raised-hover neo-raised-active'
              : 'text-text-muted hover:text-text-prim'
          )}
        >
          <Earth className="size-3.5" />
          <span>Global Board</span>
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={cn(
            'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
            activeTab === 'weekly'
              ? 'text-white neo-raised neo-raised-hover neo-raised-active'
              : 'text-text-muted hover:text-text-prim'
          )}
        >
          <Calendar className="size-3.5" />
          <span>Weekly Board</span>
        </button>
      </div>

      {isLoading ? (
        <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl overflow-hidden neo-raised">
          <Loader2 className="size-8 text-zinc-400 animate-spin" />
          <p className="text-xs text-text-muted">Compiling ranks and synchronizing player standings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Stats & Podium Display */}
          <div className="lg:col-span-5 space-y-6">
            {/* User Rank summary widget */}
            <div className="relative group p-5 rounded-2xl flex items-center justify-around gap-4 text-center font-mono transition-all neo-raised neo-raised-hover neo-raised-active">
              <div className="space-y-1">
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Your Rank</span>
                <span className="text-base font-extrabold text-text-prim block">
                  {myRankInfo.rank ? `#${myRankInfo.rank}` : 'Unranked'}
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-900 shrink-0" />
              <div className="space-y-1">
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Best Score</span>
                <span className="text-base font-extrabold text-text-prim block">
                  {myRankInfo.score ? `${myRankInfo.score}%` : '—'}
                </span>
              </div>
              <div className="h-8 w-px bg-zinc-900 shrink-0" />
              <div className="space-y-1">
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Percentile</span>
                <span className="text-base font-extrabold text-indigo-400 block">
                  {myRankInfo.percentile ? `${myRankInfo.percentile.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Podium for top 3 users */}
            <div className="relative p-6 rounded-2xl overflow-hidden neo-raised">
              <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest text-center flex items-center justify-center gap-1.5 border-b border-zinc-900/60 pb-3">
                <Star className="size-3.5 text-indigo-400 animate-pulse" />
                Podium Standings
              </h3>
              <PodiumDisplay users={usersList} />
            </div>
          </div>

          {/* Right Column: Scrollable table ranking the rest */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-mono font-bold text-zinc-450 uppercase tracking-wider px-1.5 flex items-center gap-1.5">
              <span>Rankings standings list</span>
            </h3>
            <LeaderboardTable
              users={usersList}
              myRankVal={myRankInfo.rank}
              myScoreVal={myRankInfo.score}
            />
          </div>
        </div>
      )}
    </div>
  );
}