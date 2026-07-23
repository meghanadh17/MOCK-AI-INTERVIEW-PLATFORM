import { Flame, Award, CalendarDays } from 'lucide-react';

interface StreakCardProps {
  streakData?: {
    current_streak: number;
    longest_streak: number;
    last_session_date: string | null;
  };
}

export function StreakCard({ streakData }: StreakCardProps) {
  const currentStreak = streakData?.current_streak ?? 0;
  const longestStreak = streakData?.longest_streak ?? 0;
  const lastSessionDate = streakData?.last_session_date;

  // Generate last 7 days of the calendar
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calendarDays = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayLabel = weekdays[date.getDay()];
    const isToday = date.toDateString() === today.toDateString();

    // Determine if this day is active
    let isActive = false;
    if (currentStreak > 0 && lastSessionDate) {
      const lastSession = new Date(lastSessionDate);
      const diffTime = date.getTime() - lastSession.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // If the day is within the active streak range ending around the last session
      if (diffDays <= 0 && Math.abs(diffDays) < currentStreak) {
        isActive = true;
      }
    }

    calendarDays.push({
      label: dayLabel,
      dateNum: date.getDate(),
      isToday,
      isActive,
    });
  }

  return (
    <div 
      className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl shadow-xl text-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden select-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: 'center',
      }}
    >
      {/* Background glow overlay */}
      <div className="absolute -right-20 -top-20 size-64 bg-white/[0.02] rounded-full blur-[80px] pointer-events-none" />

      {/* Left: Flame animation / Streak counter */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="p-3 bg-zinc-800 border border-zinc-700/85 rounded-full relative animate-pulse">
          <Flame className="size-10 fill-zinc-100 text-zinc-100 filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.1)]" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Current Streak</span>
          <span className="text-5xl font-extrabold font-mono tracking-tight text-white block leading-none mt-1 select-all">
            {currentStreak}
          </span>
          <span className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
            <Award className="size-3.5 text-zinc-500" />
            Longest Streak: {longestStreak} days
          </span>
        </div>
      </div>

      {/* Right: 7-day calendar strip */}
      <div className="flex flex-col items-center md:items-end gap-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
          <CalendarDays className="size-3.5 text-zinc-400" />
          Weekly Progress Tracker
        </div>

        <div className="flex items-center gap-2">
          {calendarDays.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <span className="text-[9px] font-bold opacity-60 font-sans text-zinc-400">{day.label}</span>
              
              <div 
                className={`size-8.5 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                  day.isActive
                    ? 'bg-zinc-100 text-zinc-950 border border-white shadow-md shadow-black/20'
                    : 'bg-zinc-950 border border-zinc-850 text-zinc-400'
                } ${
                  day.isToday && !day.isActive
                    ? 'ring-2 ring-zinc-450 ring-offset-2 ring-offset-zinc-900'
                    : ''
                }`}
                title={day.isToday ? 'Today' : undefined}
              >
                {day.dateNum}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}