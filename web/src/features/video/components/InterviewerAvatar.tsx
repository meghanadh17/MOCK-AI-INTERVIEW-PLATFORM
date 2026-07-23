
interface InterviewerAvatarProps {
  isSpeaking: boolean;
  compact?: boolean;
}

export function InterviewerAvatar({ isSpeaking, compact = false }: InterviewerAvatarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 select-none">
        {/* Glow Rings & Central Avatar */}
        <div className="relative flex items-center justify-center size-14 shrink-0">
          {/* Pulsing ring outer */}
          <div 
            className={`absolute inset-0 rounded-full border-2 border-indigo-500/20 transition-all duration-1000 ${
              isSpeaking ? 'animate-ping opacity-70 scale-110' : 'opacity-0 scale-95'
            }`}
          />
          
          {/* Glow backdrop */}
          <div 
            className={`absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-sm transition-opacity duration-500 ${
              isSpeaking ? 'opacity-100' : 'opacity-30'
            }`}
          />

          {/* Outer border & Circle body */}
          <div className={`relative size-11 rounded-full bg-zinc-950 border-2 transition-all duration-500 flex items-center justify-center overflow-hidden ${
            isSpeaking ? 'border-indigo-400' : 'border-zinc-800'
          }`}>
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-zinc-950 to-zinc-950" />
            
            <svg className="w-6 h-6 relative z-10 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {isSpeaking ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096m.813 5.1L7.5 17.25m3.75 3.75l1.688-3.062M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.5 21l3.39-1.13c1.23.41 2.55.63 3.91.63 4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              )}
            </svg>
          </div>
        </div>

        {/* Labels & Small Wave */}
        <div className="flex flex-col gap-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-semibold text-text-prim leading-none">
              AI Bot
            </span>
            <span className={`size-1.5 rounded-full ${isSpeaking ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-600'}`} />
          </div>
          
          {/* Small audio wave */}
          <div className="flex items-center gap-0.5 h-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-0.5 rounded-full bg-indigo-400 transition-all duration-300 ${
                  isSpeaking
                    ? 'animate-[bounce_0.6s_infinite_alternate]'
                    : 'h-1 opacity-30'
                }`}
                style={{
                  height: isSpeaking ? `${Math.floor(Math.random() * 8) + 4}px` : '4px',
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full avatar display
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl backdrop-blur-md shadow-2xl select-none w-full max-w-[200px]">
      {/* Glow Rings & Central Avatar */}
      <div className="relative flex items-center justify-center size-24">
        {/* Pulsing ring outer */}
        <div 
          className={`absolute inset-0 rounded-full border-2 border-indigo-500/20 transition-all duration-1000 ${
            isSpeaking ? 'animate-ping opacity-70 scale-110' : 'opacity-0 scale-95'
          }`}
        />
        
        {/* Glow backdrop */}
        <div 
          className={`absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500/30 to-purple-500/30 blur-md transition-opacity duration-500 ${
            isSpeaking ? 'opacity-100' : 'opacity-30'
          }`}
        />

        {/* Outer border & Circle body */}
        <div className={`relative size-20 rounded-full bg-zinc-950 border-2 transition-all duration-500 flex items-center justify-center overflow-hidden ${
          isSpeaking ? 'border-indigo-400' : 'border-zinc-700'
        }`}>
          {/* Animated Matrix/Particles inside avatar circle */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-zinc-950 to-zinc-950" />
          
          {/* SVG abstract AI face/pattern */}
          <svg className="w-12 h-12 relative z-10 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {isSpeaking ? (
              // AI speaking graphic
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096m.813 5.1L7.5 17.25m3.75 3.75l1.688-3.062M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.5 21l3.39-1.13c1.23.41 2.55.63 3.91.63 4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v3.75m0 0h3m-3 0H9" />
              </>
            ) : (
              // AI idle graphic
              <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </>
            )}
          </svg>

          {/* Abstract background waves */}
          <div className={`absolute bottom-0 inset-x-0 h-4 bg-indigo-500/10 transition-opacity duration-300 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-full h-full animate-[pulse_1.5s_infinite] bg-gradient-to-t from-indigo-500/20 to-transparent" />
          </div>
        </div>
      </div>

      {/* Info labels */}
      <div className="text-center w-full">
        <h4 className="text-sm font-heading font-semibold text-text-prim leading-tight">
          AI Interviewer
        </h4>
        <span className="text-[10px] font-mono text-indigo-400 font-medium mt-0.5 inline-block">
          {isSpeaking ? 'Speaking...' : 'Ready'}
        </span>
      </div>

      {/* Speaking Sound Wave Graphic */}
      <div className="flex items-center gap-1.5 h-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-full bg-indigo-400 transition-all duration-300 ${
              isSpeaking
                ? 'animate-[bounce_0.8s_infinite_alternate]'
                : 'h-1.5 opacity-40'
            }`}
            style={{
              height: isSpeaking ? `${Math.floor(Math.random() * 14) + 6}px` : '6px',
              animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>
      );
    }
