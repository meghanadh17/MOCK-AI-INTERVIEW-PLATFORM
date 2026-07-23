import { Search, X } from 'lucide-react';

interface JobSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  activeChips: { id: string; label: string; onRemove: () => void }[];
}

export function JobSearchBar({ value, onChange, onClear, activeChips }: JobSearchBarProps) {
  return (
    <div className="space-y-3">
      {/* Search Bar Input Container */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3.5 size-4 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search semantic job listings (e.g. FastAPI, Frontend Lead)..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-3 text-xs text-text-prim placeholder-zinc-650 outline-none transition-all rounded-xl focus:border-zinc-750 neo-sunken"
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute right-3.5 p-1 rounded-md text-text-muted hover:text-text-prim hover:bg-zinc-900 cursor-pointer transition-all"
            title="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-wider mr-1">
            Active:
          </span>
          {activeChips.map((chip) => (
            <div
              key={chip.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-text-sec hover:text-text-prim font-semibold rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)] transition-all cursor-default"
            >
              <span>{chip.label}</span>
              <button
                onClick={chip.onRemove}
                className="p-0.5 rounded-full hover:bg-zinc-800 text-text-muted hover:text-text-prim cursor-pointer transition-colors"
                title={`Remove ${chip.label} filter`}
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}