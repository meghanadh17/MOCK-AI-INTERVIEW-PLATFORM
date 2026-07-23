import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

export interface Suggestion {
  section: string;
  current: string;
  suggested: string;
  impact: 'high' | 'medium' | 'low';
}

interface ImprovementSuggestionsProps {
  suggestions: Suggestion[];
  onApplyFix: (section: string, callback: (data: any) => void) => void;
  isFixing: boolean;
}

export function ImprovementSuggestions({ suggestions, onApplyFix, isFixing }: ImprovementSuggestionsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [fixResult, setFixResult] = useState<{
    section: string;
    original: string;
    enhanced: string;
    suggestions: string[];
  } | null>(null);

  const getImpactStyle = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
        return 'border-zinc-300 text-zinc-100 bg-zinc-900 font-extrabold shadow-sm';
      case 'medium':
        return 'border-zinc-800 text-zinc-300 bg-zinc-950 font-bold';
      default:
        return 'border-zinc-900 text-zinc-500 bg-zinc-950/40';
    }
  };

  const handleFixClick = (e: React.MouseEvent, section: string) => {
    e.stopPropagation();
    toast.info(`Generating AI rewrite for '${section}' section...`);
    
    onApplyFix(section, (data) => {
      setFixResult({
        section,
        original: data.original_text,
        enhanced: data.enhanced_text,
        suggestions: data.suggestions || []
      });
      toast.success(`Generated rewrite suggestion for '${section}'!`);
    });
  };

  return (
    <div className="space-y-6 text-left">
      <h4 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
        AI Impact Suggestions
      </h4>

      <div className="space-y-3">
        {suggestions.map((s, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div 
              key={idx}
              className="rounded-2xl overflow-hidden transition-all duration-200 neo-raised"
            >
              {/* Accordion Header */}
              <div 
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-text-prim uppercase tracking-wider">
                    {s.section}
                  </span>
                  <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-full ${getImpactStyle(s.impact)}`}>
                    {s.impact} impact
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => handleFixClick(e, s.section)}
                    disabled={isFixing}
                    className="flex items-center gap-1 bg-text-prim hover:bg-zinc-200 text-bg-void hover:text-black hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] px-2.5 py-1 rounded-md text-[10px] font-bold font-heading cursor-pointer disabled:bg-zinc-800 disabled:text-text-muted transition-all duration-150 shrink-0"
                  >
                    <Sparkles className="size-3" />
                    AI Enhance
                  </button>
                  {isOpen ? <ChevronUp className="size-4 text-text-muted" /> : <ChevronDown className="size-4 text-text-muted" />}
                </div>
              </div>

              {/* Accordion Body */}
              {isOpen && (
                <div className="p-5 border-t border-zinc-900 bg-zinc-950/20 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Current text */}
                    <div className="p-4 rounded-xl space-y-2 border border-zinc-950 neo-sunken">
                      <div className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
                        Current Listing
                      </div>
                      <div className="min-h-[50px] overflow-y-auto">
                        <MarkdownRenderer 
                          content={s.current.trim().startsWith('-') || s.current.trim().startsWith('•') || s.current.trim().startsWith('*') ? s.current : `- ${s.current}`} 
                        />
                      </div>
                    </div>

                    {/* Suggested text */}
                    <div className="p-4 rounded-xl space-y-2 border border-zinc-800 neo-raised">
                      <div className="text-[10px] font-mono font-bold text-text-prim uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="size-3" />
                        AI Quantitative Suggestion
                      </div>
                      <div className="min-h-[50px] overflow-y-auto">
                        <MarkdownRenderer 
                          content={s.suggested.trim().startsWith('+') || s.suggested.trim().startsWith('•') || s.suggested.trim().startsWith('-') ? s.suggested : `+ ${s.suggested}`} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Slide-over or overlay popup displaying rewritten results */}
      {fixResult && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in duration-200">
          <div className="rounded-2xl w-full max-w-2xl p-6 text-left space-y-6 max-h-[85vh] overflow-y-auto neo-raised">
            
            <div className="flex justify-between items-start border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-prim flex items-center gap-2">
                  <Sparkles className="size-4 text-text-prim" />
                  Enhanced Rewrite Suggestions: {fixResult.section}
                </h3>
                <p className="text-text-muted text-[10px] uppercase font-mono mt-0.5">Quantified Action-First Revision</p>
              </div>
              <button 
                onClick={() => setFixResult(null)}
                className="text-[10px] font-mono px-2 py-0.5 border border-border-strong rounded bg-bg-base text-text-muted hover:text-text-prim uppercase cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Content */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Original Text</h4>
                <div className="p-4 rounded-xl min-h-[150px] max-h-[250px] overflow-y-auto border border-zinc-950 neo-sunken">
                  <MarkdownRenderer content={fixResult.original} />
                </div>
              </div>

              {/* Enhanced Content */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold text-text-prim uppercase tracking-wider flex items-center gap-1">
                  <Check className="size-3.5" />
                  AI Action-First Rewrite
                </h4>
                <div className="p-4 rounded-xl min-h-[150px] max-h-[250px] overflow-y-auto border border-zinc-800 neo-raised">
                  <MarkdownRenderer content={fixResult.enhanced} />
                </div>
              </div>
            </div>

            {/* Suggestions list */}
            {fixResult.suggestions.length > 0 && (
              <div className="p-4 rounded-xl space-y-2 border border-zinc-950 neo-sunken">
                <h4 className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">AI Impact Analysis</h4>
                <ul className="space-y-2">
                  {fixResult.suggestions.map((sug, sIdx) => (
                    <li key={sIdx} className="text-xs text-text-sec leading-relaxed flex gap-2 items-start">
                      <span className="text-text-prim font-bold shrink-0 mt-0.5">✓</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-zinc-900 pt-4">
              <button
                onClick={() => setFixResult(null)}
                className="px-4 py-2 border border-border-def bg-bg-surface hover:bg-bg-elevated text-text-prim text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}