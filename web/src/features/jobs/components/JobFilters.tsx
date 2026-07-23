import { SlidersHorizontal, X, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface JobFiltersProps {
  location: string;
  setLocation: (val: string) => void;
  experienceLevel: string;
  setExperienceLevel: (val: string) => void;
  jobType: string;
  setJobType: (val: string) => void;
  onClear: () => void;
}

export function JobFilters({
  location,
  setLocation,
  experienceLevel,
  setExperienceLevel,
  jobType,
  setJobType,
  onClear,
}: JobFiltersProps) {
  const experiences = [
    { value: 'all', label: 'All Experience Levels' },
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead / Principal' },
  ];

  const types = [
    { value: 'all', label: 'All Job Types' },
    { value: 'full-time', label: 'Full-time' },
    { value: 'contract', label: 'Contract' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'remote', label: 'Remote Only' },
  ];

  const hasActiveFilters = location || experienceLevel !== 'all' || jobType !== 'all';

  return (
    <div className="relative p-5 rounded-2xl space-y-4 text-left neo-raised">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal className="size-3.5 text-indigo-400" />
          Filter Parameters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[9px] font-mono font-bold text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer uppercase transition-colors"
          >
            <X className="size-2.5" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Location Filter */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted">Geographic Location</label>
          <div className="relative flex items-center w-full">
            <MapPin className="absolute left-3 size-3.5 text-zinc-650 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. Remote, San Francisco, NY..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs text-text-prim placeholder-zinc-650 outline-none transition-all rounded-xl focus:border-zinc-750 neo-sunken"
            />
          </div>
        </div>

        {/* Experience Level Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted">Experience Grade</label>
          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger className="!w-full !rounded-xl px-3.5 !py-4.5 text-xs text-text-prim outline-none transition-all !h-[36px] neo-sunken !border-0 focus:!ring-0">
              <SelectValue placeholder="All Experience Levels" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
              {experiences.map((exp) => (
                <SelectItem key={exp.value} value={exp.value} className="cursor-pointer focus:bg-zinc-900 font-mono text-xs">
                  {exp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Job Type Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-text-muted">Employment Type</label>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="!w-full !rounded-xl px-3.5 !py-4.5 text-xs text-text-prim outline-none transition-all !h-[36px] neo-sunken !border-0 focus:!ring-0">
              <SelectValue placeholder="All Job Types" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
              {types.map((t) => (
                <SelectItem key={t.value} value={t.value} className="cursor-pointer focus:bg-zinc-900 font-mono text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}