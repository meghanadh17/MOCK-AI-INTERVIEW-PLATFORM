import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobDescriptionExpanderProps {
  description: string;
  requirements?: string;
}

export function JobDescriptionExpander({ description, requirements }: JobDescriptionExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasRequirements = !!requirements && requirements.trim().length > 0;

  return (
    <div className="relative p-6 rounded-2xl text-left space-y-4 overflow-hidden neo-raised">
      
      <div className={cn(
        "transition-all duration-300 ease-in-out relative",
        isExpanded ? "max-h-none pb-8" : "max-h-56 pb-14"
      )}>
        {/* Description Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-900 pb-2">
            Job Description & Overview
          </h3>
          <p className="text-xs text-text-sec leading-relaxed whitespace-pre-line font-mono select-text">
            {description}
          </p>
        </div>

        {/* Requirements Section */}
        {hasRequirements && (
          <div className="space-y-3 mt-6">
            <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-900 pb-2">
              Key Requirements
            </h3>
            <p className="text-xs text-text-sec leading-relaxed whitespace-pre-line font-mono select-text">
              {requirements}
            </p>
          </div>
        )}

        {/* Fading overlay */}
        {!isExpanded && (
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Neomorphic Toggle Button */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative group flex items-center gap-1.5 px-4.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-text-sec hover:text-text-prim rounded-full transition-all cursor-pointer select-none neo-raised neo-raised-hover neo-raised-active"
        >
          <span>{isExpanded ? 'Show Less' : 'Show More Details'}</span>
          {isExpanded ? (
            <ChevronUp className="size-3 text-zinc-400 group-hover:-translate-y-0.5 transition-transform" />
          ) : (
            <ChevronDown className="size-3 text-zinc-400 group-hover:translate-y-0.5 transition-transform" />
          )}
        </button>
      </div>
    </div>
  );
}