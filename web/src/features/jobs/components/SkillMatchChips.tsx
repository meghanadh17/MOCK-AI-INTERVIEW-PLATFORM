import { Check, XCircle } from 'lucide-react';

interface SkillMatchChipsProps {
  skillsOverlap: string[];
  missingSkills: string[];
}

export function SkillMatchChips({ skillsOverlap = [], missingSkills = [] }: SkillMatchChipsProps) {
  const limit = 8;
  
  const visibleOverlap = skillsOverlap.slice(0, limit);
  const overflowOverlapCount = Math.max(0, skillsOverlap.length - limit);

  const visibleMissing = missingSkills.slice(0, limit);
  const overflowMissingCount = Math.max(0, missingSkills.length - limit);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Group 1: You Have (Matched Skills) */}
      <div className="relative p-5 rounded-2xl text-left space-y-4 neo-raised">
        
        <div>
          <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
            <Check className="size-4 text-emerald-400" />
            Skills You Have ({skillsOverlap.length})
          </h3>
          <p className="text-[9px] text-text-muted uppercase font-mono mt-1">Matched keywords in your resume</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {visibleOverlap.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-950/20 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]"
            >
              <Check className="size-3 text-emerald-400 shrink-0" />
              {skill}
            </span>
          ))}
          {overflowOverlapCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 bg-zinc-900 border border-zinc-850 text-[10px] font-mono text-zinc-400 rounded-full">
              +{overflowOverlapCount} more
            </span>
          )}
          {skillsOverlap.length === 0 && (
            <span className="text-xs text-text-muted italic">No matching skills found in resume.</span>
          )}
        </div>
      </div>

      {/* Group 2: You're Missing (Missing Skills) */}
      <div className="relative p-5 rounded-2xl text-left space-y-4 neo-raised">
        
        <div>
          <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
            <XCircle className="size-4 text-rose-400" />
            Skills You're Missing ({missingSkills.length})
          </h3>
          <p className="text-[9px] text-text-muted uppercase font-mono mt-1">Keywords requested by employer</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {visibleMissing.map((skill, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-3 py-1 bg-rose-950/20 border border-rose-500/20 text-[10px] font-bold text-rose-400 rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]"
            >
              <XCircle className="size-3 text-rose-400 shrink-0" />
              {skill}
            </span>
          ))}
          {overflowMissingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 bg-zinc-900 border border-zinc-850 text-[10px] font-mono text-zinc-400 rounded-full">
              +{overflowMissingCount} more
            </span>
          )}
          {missingSkills.length === 0 && (
            <span className="text-xs text-emerald-400 font-medium italic">Perfect match! You have all listed skills.</span>
          )}
        </div>
      </div>
    </div>
  );
}