import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from 'lucide-react';

interface AtsScorePanelProps {
  atsScore: number;
  keywordsFound: string[];
  keywordsMissing: string[];
  formattingScore?: number;
  readabilityScore?: number;
  sectionScore?: number;
}

export function AtsScorePanel({
  atsScore,
  keywordsFound,
  keywordsMissing,
  formattingScore = 85,
  readabilityScore = 80,
  sectionScore = 90
}: AtsScorePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (atsScore / 100) * circumference;

  // Keyword match calculation
  const totalKeywords = keywordsFound.length + keywordsMissing.length;
  const keywordMatchPercentage = totalKeywords > 0 
    ? Math.round((keywordsFound.length / totalKeywords) * 100)
    : 70;

  const metrics = [
    { name: 'Formatting & Layout', val: formattingScore },
    { name: 'Keyword Coverage', val: keywordMatchPercentage },
    { name: 'Section Checkpoints', val: sectionScore },
    { name: 'Readability Score', val: readabilityScore }
  ];

  // Rating and color matching
  const getRating = (score: number) => {
    if (score >= 80) return { label: 'Good', color: 'text-zinc-100 bg-zinc-900 border-zinc-800', stroke: 'stroke-zinc-100' };
    if (score >= 60) return { label: 'Average', color: 'text-zinc-400 bg-zinc-900/60 border-zinc-850', stroke: 'stroke-zinc-400' };
    return { label: 'Action Required', color: 'text-zinc-500 bg-zinc-950 border-zinc-900', stroke: 'stroke-zinc-700' };
  };

  const rating = getRating(atsScore);

  const getMetricColor = (val: number) => {
    if (val >= 80) return 'bg-zinc-200';
    if (val >= 50) return 'bg-zinc-400';
    return 'bg-zinc-700';
  };

  return (
    <div className="rounded-2xl overflow-hidden text-left neo-raised">
      {/* Header Row */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-5 flex justify-between items-center cursor-pointer select-none hover:bg-zinc-900/40 transition-colors"
      >
        <h2 className="text-xs font-mono font-bold text-text-prim uppercase tracking-wider flex items-center gap-2">
          <Shield className="size-4 text-text-muted" />
          ATS Compliance Audit
        </h2>
        <button className="text-[10px] font-mono uppercase font-bold text-text-sec flex items-center gap-1 hover:text-text-prim cursor-pointer">
          {isCollapsed ? 'Show Audit' : 'Hide Audit'}
          {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="px-6 pb-6 pt-2 space-y-6 animate-fade-in">
          {/* Metrics Container (Enclosed in a border box with 2 columns) */}
          <div className="p-5 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-6 items-center neo-sunken">
            
            {/* Left Column: Donut Gauge (col-span-1) */}
            <div className="md:col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-900 pb-6 md:pb-0 md:pr-6">
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mb-4">ATS Score</span>
              
              <div className="relative size-32 flex items-center justify-center">
                <svg className="size-full transform -rotate-90">
                  <circle cx="64" cy="64" r={radius} className="stroke-zinc-900" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="64" 
                    cy="64" 
                    r={radius} 
                    className={`${rating.stroke} transition-all duration-1000 ease-out`}
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="font-mono text-3xl font-extrabold text-text-prim leading-none">{atsScore}</span>
                  <span className="text-[8px] text-text-muted uppercase tracking-wider font-bold mt-1">out of 100</span>
                </div>
              </div>

              {/* Status Pill */}
              <div className={`mt-4 inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold border rounded-full ${rating.color}`}>
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                {rating.label}
              </div>
            </div>

            {/* Right Column: Progress Bars Grid (col-span-3) */}
            <div className="md:col-span-3 space-y-4">
              <span className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider block">ATS Compliance Metrics</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.map((prog, idx) => (
                  <div key={idx} className="space-y-1.5 p-3.5 bg-zinc-950 rounded-xl border border-zinc-900 hover:border-zinc-800 transition-colors">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-text-sec">{prog.name}</span>
                      <span className="font-mono text-text-prim">{prog.val}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-950">
                      <div className={`h-full ${getMetricColor(prog.val)} transition-all duration-500`} style={{ width: `${prog.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Section: Keywords list details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-zinc-900">
            {/* Keywords Found */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-text-prim uppercase tracking-wider">
                <CheckCircle2 className="size-4 text-zinc-100" />
                Keywords Identified ({keywordsFound.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywordsFound.length > 0 ? (
                  keywordsFound.map((kw, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 text-[10px] font-mono border border-zinc-800 bg-zinc-900 text-zinc-100 rounded-md hover:border-zinc-700 hover:bg-zinc-850 transition-colors shadow-sm cursor-default"
                    >
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-text-disabled italic">None found</span>
                )}
              </div>
            </div>

            {/* Keywords Missing */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-text-sec uppercase tracking-wider">
                <AlertTriangle className="size-4 text-zinc-400" />
                Missing Target Keywords ({keywordsMissing.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywordsMissing.length > 0 ? (
                  keywordsMissing.map((kw, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 text-[10px] font-mono border border-dashed border-zinc-800 bg-zinc-950 text-zinc-400 rounded-md hover:border-zinc-700 hover:bg-zinc-900 transition-colors cursor-default"
                    >
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-text-disabled italic">None missing</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}