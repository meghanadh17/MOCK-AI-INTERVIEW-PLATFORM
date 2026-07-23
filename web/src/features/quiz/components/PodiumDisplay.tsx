import { motion } from 'framer-motion';
import { Crown, Medal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LeaderboardUser {
  rank: number;
  user_id: string;
  name: string;
  score: number;
  is_current_user: boolean;
}

interface PodiumDisplayProps {
  users: LeaderboardUser[];
}

export function PodiumDisplay({ users }: PodiumDisplayProps) {
  // Extract top 3 users
  const first = users.find((u) => u.rank === 1) || null;
  const second = users.find((u) => u.rank === 2) || null;
  const third = users.find((u) => u.rank === 3) || null;

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  // Motion variants
  const podiumItemVariants: any = {
    hidden: { y: 50, opacity: 0 },
    show: (customDelay: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
        delay: customDelay,
      },
    }),
  };

  return (
    <div className="flex items-end justify-center gap-4 md:gap-8 pt-10 pb-4 select-none min-h-[220px]">
      {/* 2nd Place */}
      {second && (
        <motion.div
          custom={0.2}
          variants={podiumItemVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center w-20 md:w-28 text-center"
        >
          {/* Avatar & Medal */}
          <div className="relative mb-2">
            <Avatar size="lg" className="border border-slate-400/40 ring-4 ring-slate-400/10">
              <AvatarFallback className="bg-zinc-800 text-zinc-300 font-bold font-mono">
                {getInitials(second.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-3.5 -right-1 bg-slate-500 text-white rounded-full p-0.5 border border-white/20 shadow-md">
              <Medal className="size-3.5 text-zinc-100" />
            </span>
          </div>
          <p className="text-[11px] font-bold text-zinc-300 truncate max-w-full">
            {second.name}
          </p>
          <p className="text-[10px] font-mono font-bold text-zinc-400 mt-0.5">
            {second.score}%
          </p>

          {/* Podium block */}
          <div className="w-full h-20 bg-gradient-to-t from-slate-400/5 to-slate-400/25 border border-slate-400/25 rounded-t-xl mt-2.5 flex items-center justify-center font-heading font-black text-xl text-slate-400 shadow-[0_-4px_24px_rgba(148,163,184,0.08)]">
            2nd
          </div>
        </motion.div>
      )}

      {/* 1st Place */}
      {first && (
        <motion.div
          custom={0}
          variants={podiumItemVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center w-24 md:w-32 text-center z-10"
        >
          {/* Avatar & Crown */}
          <div className="relative mb-2 scale-110">
            <Avatar size="lg" className="border border-indigo-500/40 ring-4 ring-indigo-500/10">
              <AvatarFallback className="bg-zinc-850 text-indigo-200 font-bold font-mono">
                {getInitials(first.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-indigo-400 animate-bounce">
              <Crown className="size-5 fill-indigo-400/20 text-indigo-400 filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.5)]" />
            </span>
          </div>
          <p className="text-xs font-bold text-text-prim truncate max-w-full mt-1.5">
            {first.name}
          </p>
          <p className="text-xs font-mono font-extrabold text-indigo-400 mt-0.5">
            {first.score}%
          </p>

          {/* Podium block */}
          <div className="w-full h-28 bg-gradient-to-t from-indigo-500/5 to-indigo-500/25 border border-indigo-500/25 rounded-t-xl mt-2.5 flex items-center justify-center font-heading font-black text-2xl text-indigo-400 shadow-[0_-4px_32px_rgba(99,102,241,0.12)]">
            1st
          </div>
        </motion.div>
      )}

      {/* 3rd Place */}
      {third && (
        <motion.div
          custom={0.4}
          variants={podiumItemVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center w-16 md:w-24 text-center"
        >
          {/* Avatar & Medal */}
          <div className="relative mb-2">
            <Avatar size="lg" className="border border-emerald-500/40 ring-4 ring-emerald-500/10">
              <AvatarFallback className="bg-zinc-800 text-emerald-400 font-bold font-mono">
                {getInitials(third.name)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-3.5 -right-1 bg-emerald-950 border border-emerald-500/20 text-emerald-400 rounded-full p-0.5 shadow-md">
              <Medal className="size-3.5 text-emerald-400" />
            </span>
          </div>
          <p className="text-[11px] font-bold text-zinc-300 truncate max-w-full">
            {third.name}
          </p>
          <p className="text-[10px] font-mono font-bold text-emerald-500 mt-0.5">
            {third.score}%
          </p>

          {/* Podium block */}
          <div className="w-full h-14 bg-gradient-to-t from-emerald-500/5 to-emerald-500/25 border border-emerald-500/25 rounded-t-xl mt-2.5 flex items-center justify-center font-heading font-black text-lg text-emerald-500 shadow-[0_-4px_24px_rgba(16,185,129,0.08)]">
            3rd
          </div>
        </motion.div>
      )}
    </div>
  );
}