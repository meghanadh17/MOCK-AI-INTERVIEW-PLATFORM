import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SessionFiltersProps {
  roleFilter: string;
  setRoleFilter: (val: string) => void;
  typeFilter: string;
  setTypeFilter: (val: string) => void;
  sortOrder: string;
  setSortOrder: (val: string) => void;
}

export function SessionFilters({
  roleFilter,
  setRoleFilter,
  typeFilter,
  setTypeFilter,
  sortOrder,
  setSortOrder
}: SessionFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.015)] backdrop-blur-md">
      {/* Role Search */}
      <div className="relative flex-1">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
          <Search className="size-4" />
        </span>
        <input
          type="text"
          placeholder="Search by role (e.g. Software Engineer)..."
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full pl-9 pr-4 py-2 h-9 text-xs bg-zinc-950 border border-zinc-850 focus:border-zinc-500/50 rounded-lg outline-none transition-all duration-200 text-text-prim placeholder-text-muted shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-row items-center gap-3 w-full md:w-auto">
        {/* Type Select */}
        <div className="flex flex-col gap-1 flex-1 md:flex-none md:min-w-[120px]">
          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider font-sans">Interview Type</span>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full bg-zinc-950 border border-zinc-850 hover:bg-zinc-900/60 rounded-lg text-xs py-2 h-9 px-3 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)] transition-all">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl">
              <SelectItem value="all" className="rounded-lg">All Types</SelectItem>
              <SelectItem value="text" className="rounded-lg">Text Mock AI</SelectItem>
              <SelectItem value="video" className="rounded-lg">Video Practice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Select */}
        <div className="flex flex-col gap-1 flex-1 md:flex-none md:min-w-[150px]">
          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider font-sans">Sort By</span>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full bg-zinc-950 border border-zinc-850 hover:bg-zinc-900/60 rounded-lg text-xs py-2 h-9 px-3 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)] transition-all">
              <SelectValue placeholder="Newest First" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-2xl">
              <SelectItem value="newest" className="rounded-lg">Newest First</SelectItem>
              <SelectItem value="oldest" className="rounded-lg">Oldest First</SelectItem>
              <SelectItem value="highest" className="rounded-lg">Highest Score</SelectItem>
              <SelectItem value="lowest" className="rounded-lg">Lowest Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}