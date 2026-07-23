import { useState } from 'react';
import { Search } from 'lucide-react';

interface Skill {
  name: string;
  proficiency?: string; // "Beginner" | "Intermediate" | "Expert" | "Advanced"
  evidence?: string;
}

interface SkillsGridProps {
  skills: Skill[];
}

export function SkillsGrid({ skills }: SkillsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || 
      (skill.proficiency?.toLowerCase() === filterLevel.toLowerCase());
    return matchesSearch && matchesLevel;
  });

  // Helper to generate dynamic progress percentage and color/style based on level
  const getSkillMeta = (name: string, level?: string) => {
    const lvl = level?.toLowerCase() || 'intermediate';
    
    // Deterministic offset based on name length to make percentages look natural/diverse
    const offset = (name.length % 2 === 0) ? 5 : 0;

    switch (lvl) {
      case 'expert':
        return {
          percentage: 90 + (name.length % 2 === 0 ? 0 : 5), // 90% or 95%
          badgeClass: 'text-zinc-100 bg-zinc-900 border-zinc-800',
          dotClass: 'bg-zinc-100',
          barClass: 'bg-zinc-200'
        };
      case 'advanced':
        return {
          percentage: 75 + offset, // 75% or 80%
          badgeClass: 'text-zinc-300 bg-zinc-900/60 border-zinc-850',
          dotClass: 'bg-zinc-300',
          barClass: 'bg-zinc-400'
        };
      case 'intermediate':
        return {
          percentage: 60 + offset, // 60% or 65%
          badgeClass: 'text-zinc-400 bg-zinc-900/40 border-zinc-900',
          dotClass: 'bg-zinc-400',
          barClass: 'bg-zinc-650'
        };
      case 'basic':
      case 'beginner':
      default:
        return {
          percentage: 45 + offset, // 45% or 50%
          badgeClass: 'text-zinc-500 bg-zinc-950 border-zinc-900/40',
          dotClass: 'bg-zinc-600',
          barClass: 'bg-zinc-800'
        };
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
            <Search className="size-3.5" />
          </span>
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl text-xs text-text-prim placeholder-text-disabled outline-none transition-all neo-sunken"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Level</span>
          <div className="flex border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950 h-9 p-0.5">
            {['all', 'expert', 'advanced', 'intermediate', 'basic'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-lg ${
                  filterLevel === lvl
                    ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-800/50'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Title Bar */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
        <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">Technical Skills</h3>
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">View All ({filteredSkills.length})</span>
      </div>

      {/* Skills Card Grid */}
      {filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSkills.map((skill, idx) => {
            const meta = getSkillMeta(skill.name, skill.proficiency);
            return (
              <div 
                key={idx}
                className="p-4 rounded-2xl flex flex-col justify-between h-[88px] cursor-default transition-all duration-200 neo-raised neo-raised-hover"
                title={skill.evidence || `Evidence: Not specified`}
              >
                {/* Top Row: Name and Level Pill */}
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-text-prim truncate" title={skill.name}>
                    {skill.name}
                  </span>
                  {skill.proficiency && (
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase tracking-wide flex items-center gap-1 shrink-0 ${meta.badgeClass}`}>
                      <span className={`size-1 rounded-full ${meta.dotClass}`} />
                      {skill.proficiency}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Progress and percentage */}
                <div className="space-y-1">
                  <div className="flex justify-end text-[9px] font-mono font-bold text-text-sec">
                    <span>{meta.percentage}%</span>
                  </div>
                  <div className="h-1 bg-zinc-950 border border-zinc-950/20 rounded-full overflow-hidden neo-sunken">
                    <div className={`h-full ${meta.barClass} transition-all duration-500`} style={{ width: `${meta.percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-bg-base/30 border border-border-subtle rounded-xl text-text-muted text-xs">
          No skills matches found.
        </div>
      )}
    </div>
  );
}