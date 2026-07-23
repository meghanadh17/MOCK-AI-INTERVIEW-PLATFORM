import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Video, Award, Briefcase } from 'lucide-react';

export function QuickActionsGrid() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'AI Interview Practice',
      desc: 'Surgical mock tech session with real-time feedback.',
      path: '/app/interview',
      icon: <Brain className="size-5" />,
    },
    {
      title: 'Video Interview Feedback',
      desc: 'Real-time eye contact, posture, and speech pacing analytics.',
      path: '/app/video',
      icon: <Video className="size-5" />,
    },
    {
      title: 'Take a Quick Quiz',
      desc: 'Test your conceptual software engineering depth.',
      path: '/app/quiz',
      icon: <Award className="size-5" />,
    },
    {
      title: 'Browse Matched Jobs',
      desc: 'See real software engineer listings optimized for your profile.',
      path: '/app/jobs',
      icon: <Briefcase className="size-5" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
      {actions.map((action, i) => (
        <div 
          key={i} 
          onClick={() => navigate(action.path)}
          className="neo-raised neo-raised-hover neo-raised-active p-6 rounded-2xl cursor-pointer group flex flex-col justify-between h-full select-none"
        >
          <div className="flex gap-4 items-start">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-900 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] text-zinc-300 shrink-0 group-hover:scale-105 group-hover:bg-zinc-900 group-hover:text-zinc-100 transition-all duration-300">
              {action.icon}
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-base font-heading font-extrabold text-zinc-100 group-hover:text-white transition-colors duration-200">
                {action.title}
              </h3>
              <p className="text-zinc-400 text-xs mt-2 leading-relaxed font-sans">
                {action.desc}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-end">
            <span 
              className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 text-zinc-500 group-hover:text-zinc-200 transition-colors duration-250"
            >
              Go to module
              <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}