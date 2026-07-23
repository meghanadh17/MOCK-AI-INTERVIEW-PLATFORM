export function MatchGauge({ score }: { score: number }) {
  const radius = 40;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-36 h-20 flex items-end justify-center select-none overflow-hidden">
      <svg className="size-full transform rotate-180">
        <path d="M18,72 A54,54 0 0,1 126,72" className="stroke-bg-muted" strokeWidth="8" fill="transparent" />
        <circle cx="72" cy="72" r={radius} className="stroke-amber-500" strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="font-mono text-2xl font-black text-text-prim leading-none">{score}%</span>
      </div>
    </div>
  );
}