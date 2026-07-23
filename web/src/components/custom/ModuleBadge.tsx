export function ModuleBadge({ label, colorClass }: any) {
  return (
    <span className={`px-2 py-0.5 font-mono text-[9px] uppercase font-bold rounded ${colorClass}`}>
      {label}
    </span>
  );
}