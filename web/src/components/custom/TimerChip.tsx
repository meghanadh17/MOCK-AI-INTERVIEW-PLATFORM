export function TimerChip({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return <span className="px-3 py-1 font-mono text-xs font-bold bg-bg-surface border border-border-def rounded-full text-text-prim">{m}:{s}</span>;
}