import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUserProfileQuery } from '@/hooks/useAuthQueries';

export function WelcomeHeader() {
  const { data: user } = useUserProfileQuery();
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting('Good morning');
    } else if (hours < 18) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, []);

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Developer';
  const avatarUrl = user?.avatar_url || '';
  const initials = user?.full_name 
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
    : 'D';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left border-b border-zinc-900 pb-6 relative z-10">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-12 border border-zinc-800 shadow-[4px_4px_12px_rgba(0,0,0,0.6)] bg-zinc-950 rounded-xl shrink-0">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.full_name} className="object-cover" />}
          <AvatarFallback className="bg-zinc-900 text-zinc-100 border border-zinc-800 font-semibold font-mono">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-zinc-100 flex items-center gap-2"
          >
            {greeting}, {firstName} 👋
          </motion.h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-1">
            Ready for your AI interview preparation session? Let's check your stats.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto shrink-0">
        <span className="text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 bg-zinc-950 border border-zinc-900/60 rounded-xl text-zinc-400 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.8)]">
          {formattedDate}
        </span>
        <button className="relative p-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-100 rounded-xl border border-zinc-800/80 shadow-[4px_4px_10px_rgba(0,0,0,0.6),-2px_-2px_8px_rgba(255,255,255,0.01)] transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95">
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-zinc-100 ring-2 ring-zinc-900 group-hover:scale-110 transition-transform"></span>
          <Bell className="size-4.5 transition-transform group-hover:rotate-12 duration-200" />
        </button>
      </div>
    </div>
  );
}