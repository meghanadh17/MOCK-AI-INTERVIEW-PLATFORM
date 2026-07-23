export function ScoreDonut({ score, radius = 45 }: { score: number; radius?: number }) {
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative size-36 flex items-center justify-center select-none">
      <svg className="size-full transform -rotate-90">
        <circle cx="72" cy="72" r={radius} className="stroke-bg-muted" strokeWidth="10" fill="transparent" />
        <circle cx="72" cy="72" r={radius} className="stroke-sky-500 transition-all duration-1000" strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-3xl font-extrabold text-text-prim leading-none">{score}</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold mt-1">out of 100</span>
      </div>
    </div>
  );
}