import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Award, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  rank: number;
  user_id: string;
  name: string;
  score: number;
  is_current_user: boolean;
}

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  myRankVal?: number | null;
  myScoreVal?: number | null;
}

export function LeaderboardTable({ users, myRankVal, myScoreVal }: LeaderboardTableProps) {
  const currentUserInTopList = users.find((u) => u.is_current_user);
  
  // Determine if we should show a sticky bottom row for the current user
  const hasMyRankInfo = myRankVal !== undefined && myRankVal !== null;
  const isMyRankOutOfView = hasMyRankInfo && (!currentUserInTopList || myRankVal > users.length);
  
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="size-4 text-indigo-450" />;
    if (rank === 2) return <Award className="size-4 text-zinc-400" />;
    if (rank === 3) return <Award className="size-4 text-emerald-450" />;
    return <span className="font-mono text-zinc-500 font-bold">{rank}</span>;
  };

  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col select-none neo-raised">
      <div className="overflow-x-auto max-h-[350px] no-scrollbar">
        <Table>
          <TableHeader className="bg-zinc-950/40 sticky top-0 z-10 border-b border-zinc-900">
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="w-[60px] text-center">Rank</TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead className="text-right">Accuracy Badge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow
                key={u.user_id}
                className={cn(
                  'border-b border-zinc-850 hover:bg-zinc-900/30 transition-colors',
                  u.is_current_user && 'bg-indigo-500/5 hover:bg-indigo-500/10'
                )}
              >
                <TableCell className="text-center font-bold">
                  <div className="flex items-center justify-center">
                    {getRankBadge(u.rank)}
                  </div>
                </TableCell>
                <TableCell>
                  <Avatar size="sm" className="border border-zinc-800">
                    <AvatarFallback className="bg-zinc-850 text-zinc-400 text-[10px] font-bold">
                      {getInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-semibold text-text-prim">
                  <div className="flex items-center gap-2">
                    <span>{u.name}</span>
                    {u.is_current_user && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        You
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-bold text-text-sec">
                  {u.score}%
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      'text-[9px] font-extrabold font-mono px-2 py-0.5 rounded-lg border uppercase tracking-wider',
                      u.score >= 80
                        ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                        : u.score >= 50
                        ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-400'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                    )}
                  >
                    {u.score >= 80 ? 'Expert' : u.score >= 50 ? 'Practitioner' : 'Novice'}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sticky row for user's rank if it's out of scroll view */}
      {isMyRankOutOfView && (
        <div className="flex items-center justify-between p-3.5 border-t border-indigo-500/25 bg-indigo-950/20 text-indigo-400 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-indigo-300 w-10 text-center">
              #{myRankVal}
            </span>
            <Avatar size="sm" className="border border-indigo-500/20">
              <AvatarFallback className="bg-indigo-950 text-indigo-300 text-[10px] font-bold">
                YO
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 text-xs font-bold text-text-prim">
              <span>You</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Out of View
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="font-mono text-indigo-300">
              {myScoreVal ?? 0}%
            </span>
            <span className="text-[9px] font-extrabold font-mono px-2 py-0.5 rounded-lg border border-indigo-500/20 bg-indigo-950/30 text-indigo-400 uppercase tracking-wider">
              {(myScoreVal ?? 0) >= 80 ? 'Expert' : (myScoreVal ?? 0) >= 50 ? 'Practitioner' : 'Novice'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}