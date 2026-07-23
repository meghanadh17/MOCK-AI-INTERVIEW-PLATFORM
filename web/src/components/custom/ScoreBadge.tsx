export function ScoreBadge({ score }: { score: number }) {
  const isAvailable = score !== undefined && score !== null;
  let colorClasses = 'text-zinc-400 bg-zinc-950 border-zinc-900/60';
  if (isAvailable) {
    if (score >= 80) {
      colorClasses = 'text-emerald-450 bg-emerald-950/20 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.08)]';
    } else if (score >= 50) {
      colorClasses = 'text-amber-450 bg-amber-950/20 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.08)]';
    } else {
      colorClasses = 'text-rose-450 bg-rose-950/20 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.08)]';
    }
  }

  return (
    <span className={`font-mono text-xs font-bold px-2.5 py-1 border rounded-lg shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)] transition-colors ${colorClasses}`}>
      {isAvailable ? `${score}%` : 'N/A'}
    </span>
  );
}