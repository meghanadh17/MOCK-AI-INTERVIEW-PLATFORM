export function getScoreColor(score: number) {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-indigo-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-rose-400';
}