import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface OnboardingSliderProps {
  onClose: () => void;
}

interface SlideData {
  title: string;
  description: string;
  colorClass: string;
  glowColor: string;
  illustration: React.ReactNode;
}

export function OnboardingSlider({ onClose }: OnboardingSliderProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const slides: SlideData[] = [
    {
      title: "Adaptive AI Interviews",
      description: "Experience dynamic mock interviews with an adaptive AI coach. Receive deep real-time feedback on your speech patterns, answers, and visual presentation.",
      colorClass: "from-cyan-500/20 to-blue-600/10",
      glowColor: "rgba(6, 182, 212, 0.15)",
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full max-h-[160px] md:max-h-[200px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="cyan-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="cyan-blue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="70" fill="url(#cyan-glow)" />
          
          {/* Animated soundwaves and AI face mockup */}
          <rect x="55" y="85" width="6" height="30" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="30;50;20;30" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="y" values="85;75;90;85" dur="1.2s" repeatCount="indefinite" />
          </rect>
          <rect x="70" y="75" width="6" height="50" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="50;25;65;50" dur="1s" repeatCount="indefinite" />
            <animate attributeName="y" values="75;87.5;67.5;75" dur="1s" repeatCount="indefinite" />
          </rect>
          <rect x="85" y="65" width="6" height="70" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="70;40;85;70" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="y" values="65;80;57.5;65" dur="1.5s" repeatCount="indefinite" />
          </rect>
          <rect x="100" y="55" width="6" height="90" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="90;60;105;90" dur="1.3s" repeatCount="indefinite" />
            <animate attributeName="y" values="55;70;47.5;55" dur="1.3s" repeatCount="indefinite" />
          </rect>
          <rect x="115" y="65" width="6" height="70" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="70;85;45;70" dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="y" values="65;57.5;77.5;65" dur="1.1s" repeatCount="indefinite" />
          </rect>
          <rect x="130" y="75" width="6" height="50" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="50;60;30;50" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="y" values="75;70;85;75" dur="1.4s" repeatCount="indefinite" />
          </rect>
          <rect x="145" y="85" width="6" height="30" rx="3" fill="url(#cyan-blue)">
            <animate attributeName="height" values="30;15;45;30" dur="0.9s" repeatCount="indefinite" />
            <animate attributeName="y" values="85;92.5;77.5;85" dur="0.9s" repeatCount="indefinite" />
          </rect>
          
          {/* Neon coaching eye radar ring */}
          <circle cx="100" cy="100" r="85" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="12s" repeatCount="indefinite" />
          </circle>
        </svg>
      )
    },
    {
      title: "ATS Resume Optimization",
      description: "Upload your resume to perform instant diagnostics. Scan for keywords, formatting, metric impact, and receive tailored advice to match target job descriptions.",
      colorClass: "from-purple-500/20 to-indigo-600/10",
      glowColor: "rgba(168, 85, 247, 0.15)",
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full max-h-[160px] md:max-h-[200px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="purple-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="purple-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="70" fill="url(#purple-glow)" />
          
          {/* Document shape container */}
          <rect x="65" y="45" width="70" height="95" rx="8" stroke="url(#purple-indigo)" strokeWidth="2.5" fill="#0c0d12" fillOpacity="0.8" />
          
          {/* Abstract lines on document */}
          <line x1="80" y1="65" x2="110" y2="65" stroke="url(#purple-indigo)" strokeWidth="3" strokeLinecap="round" />
          <line x1="80" y1="80" x2="120" y2="80" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <line x1="80" y1="92" x2="115" y2="92" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <line x1="80" y1="104" x2="105" y2="104" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          
          {/* Optimization check bubble */}
          <circle cx="120" cy="115" r="16" fill="#6366f1" />
          <path d="M114 115L118 119L126 111" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Float sparkles */}
          <circle cx="45" cy="70" r="3" fill="#c084fc">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="transform" type="translate" values="0 0; 0 -10; 0 0" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="155" cy="80" r="4" fill="#6366f1">
            <animate attributeName="opacity" values="1;0.2;1" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="transform" type="translate" values="0 0; 0 10; 0 0" dur="2.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      )
    },
    {
      title: "Conceptual Skill Quizzes",
      description: "Assess your domain knowledge with quick mock quizzes. Rise on the regional leaderboards, challenge conceptual topics, and benchmark your progress.",
      colorClass: "from-emerald-500/20 to-teal-600/10",
      glowColor: "rgba(16, 185, 129, 0.15)",
      illustration: (
        <svg viewBox="0 0 200 200" className="w-full h-full max-h-[160px] md:max-h-[200px]" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="emerald-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="emerald-teal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="70" fill="url(#emerald-glow)" />
          
          {/* Trophy Illustration */}
          <path d="M75 70C75 55 125 55 125 70V105C125 120 75 120 75 105V70Z" fill="url(#emerald-teal)" />
          <path d="M75 80H65C58 80 58 95 65 95H75" stroke="url(#emerald-teal)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M125 80H135C142 80 142 95 135 95H125" stroke="url(#emerald-teal)" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M100 115V132" stroke="url(#emerald-teal)" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="80" y="132" width="40" height="8" rx="4" fill="url(#emerald-teal)" />
          
          {/* Crown/Rating symbol at top */}
          <path d="M90 47L95 52L100 45L105 52L110 47L107 59H93L90 47Z" fill="#34d399" />
          
          {/* Floating score particles */}
          <circle cx="55" cy="120" r="3.5" fill="#34d399" />
          <circle cx="145" cy="65" r="4.5" fill="#14b8a6" />
        </svg>
      )
    }
  ];

  const handleNext = () => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent(current + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (current > 0) {
      setDirection(-1);
      setCurrent(current - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('mocrai_onboarded', 'true');
    onClose();
  };

  // Variants for Framer Motion sliding animations
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? '100%' : '-100%',
      opacity: 0,
      transition: {
        x: { type: "spring" as const, stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-[6px] p-4">
      {/* Background radial spotlight flare behind panel */}
      <div 
        className="absolute w-[300px] h-[300px] rounded-full blur-[80px] opacity-20 pointer-events-none transition-all duration-500"
        style={{
          backgroundColor: slides[current].glowColor,
          left: 'calc(50% - 150px)',
          top: 'calc(50% - 150px)',
        }}
      />

      {/* Main card container */}
      <div className="relative w-full max-w-[480px] bg-[#0c0d12]/90 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col min-h-[460px] md:min-h-[500px]">
        
        {/* Top Header bar with Skip option */}
        <div className="flex justify-between items-center px-6 pt-5 pb-3 z-10 select-none">
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-text-muted">
            Onboarding • {current + 1} of {slides.length}
          </span>
          {current < slides.length - 1 ? (
            <button
              onClick={handleComplete}
              className="text-xs text-text-muted hover:text-text-prim font-semibold cursor-pointer transition-colors duration-150"
            >
              Skip
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="text-text-muted hover:text-text-prim p-1 rounded-full hover:bg-white/5 cursor-pointer transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Swipe Slide Content (framer motion animated) */}
        <div className="flex-1 relative px-6 md:px-8 py-2 overflow-hidden flex flex-col justify-center items-center">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex flex-col items-center text-center gap-6"
            >
              {/* SVG Illustration wrapper with custom gradients */}
              <div className={`w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br ${slides[current].colorClass} flex items-center justify-center border border-white/5 shadow-inner p-4`}>
                {slides[current].illustration}
              </div>

              {/* Title & Body Description */}
              <div className="flex flex-col gap-2 max-w-[340px]">
                <h3 className="text-lg md:text-xl font-bold font-heading text-text-prim leading-snug">
                  {slides[current].title}
                </h3>
                <p className="text-text-muted text-[11px] md:text-xs leading-relaxed font-sans">
                  {slides[current].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer controls & dot indicators */}
        <div className="px-6 pb-6 pt-4 border-t border-white/5 bg-[#08090d]/50 flex flex-col gap-4 select-none">
          
          {/* Dot Indicators */}
          <div className="flex justify-center items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > current ? 1 : -1);
                  setCurrent(index);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  current === index ? 'w-5 bg-text-prim' : 'w-1.5 bg-[#27272A] hover:bg-zinc-700'
                }`}
              />
            ))}
          </div>

          {/* Action buttons row */}
          <div className="flex justify-between items-center gap-4 mt-1">
            {/* Back button */}
            <button
              onClick={handlePrev}
              disabled={current === 0}
              className={`h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all duration-150 select-none cursor-pointer ${
                current === 0
                  ? 'border-transparent text-transparent pointer-events-none'
                  : 'bg-transparent border-border-strong text-text-sec hover:text-text-prim hover:bg-white/5'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            {/* Next/Get Started button */}
            <button
              onClick={handleNext}
              className="h-9 px-5 bg-text-prim hover:bg-white hover:text-black text-bg-void font-bold text-xs rounded-lg border border-border-strong shadow-sm shadow-white/5 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer select-none"
            >
              {current === slides.length - 1 ? (
                <>
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
