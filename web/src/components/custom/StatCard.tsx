export function StatCard({ title, value, detail, icon }: any) {
  return (
    <div className="p-5 neo-raised neo-raised-hover neo-raised-active rounded-2xl relative overflow-hidden transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">{title}</span>
        <span className="p-2 rounded-xl bg-zinc-950 border border-zinc-900/60 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.6)] text-zinc-400 shrink-0">{icon}</span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-mono font-black text-zinc-100 leading-none tracking-tight">{value}</span>
        {detail && (
          <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-900 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)]">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}