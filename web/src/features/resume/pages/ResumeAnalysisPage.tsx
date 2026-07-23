import { useParams, useNavigate } from 'react-router-dom';
import { 
  useResumeAnalysisQuery, 
  useEnhanceSectionMutation,
  useResumeDetailQuery
} from '../hooks/useResumeQueries';
import { ImprovementSuggestions } from '../components/ImprovementSuggestions';
import { ArrowLeft, Sparkles, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { formatTextOrObject } from '@/lib/utils';

export function ResumeAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: detail, isLoading: detailLoading } = useResumeDetailQuery(id || '');
  const { data: analysisData, isLoading: analysisLoading } = useResumeAnalysisQuery(id || '');
  const enhanceMutation = useEnhanceSectionMutation();

  const handleApplyFix = (section: string, callback: (data: any) => void) => {
    if (!id) return;
    
    // section_type on backend usually matches UPPERCASE (e.g. 'EXPERIENCE', 'SUMMARY')
    const sectionTypeUpper = section.toUpperCase();
    
    enhanceMutation.mutate(
      { id, sectionType: sectionTypeUpper },
      {
        onSuccess: (data) => {
          callback(data);
        },
        onError: () => {
          toast.error(`Failed to generate enhancement suggestions for '${section}'.`);
        }
      }
    );
  };

  const isLoading = detailLoading || analysisLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse text-left">
        <div className="flex items-center gap-4 border-b border-border-subtle pb-5">
          <div className="size-8 bg-bg-elevated rounded-lg" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-bg-elevated rounded w-1/3" />
            <div className="h-3.5 bg-bg-elevated rounded w-1/4" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-bg-surface border border-border-def rounded-xl" />
          <div className="h-32 bg-bg-surface border border-border-def rounded-xl" />
        </div>

        <div className="space-y-4">
          <div className="h-6 bg-bg-elevated rounded w-1/4" />
          <div className="h-40 bg-bg-surface border border-border-def rounded-xl" />
        </div>
      </div>
    );
  }

  const analysis = analysisData?.analysis;

  if (!analysis) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>No AI analysis details available for this resume.</p>
        <button 
          onClick={() => navigate(`/app/resumes/${id}`)}
          className="mt-4 text-xs font-semibold text-text-prim hover:underline"
        >
          Back to Details
        </button>
      </div>
    );
  }

  const strengths = analysis.strengths || [];
  const gaps = analysis.gaps || [];
  const suggestions = analysis.improvement_suggestions || [];
  const redFlags = analysis.red_flags || [];

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border-subtle pb-5">
        <button
          onClick={() => navigate(`/app/resumes/${id}`)}
          className="p-2 rounded-xl cursor-pointer text-text-muted hover:text-text-prim transition-all shrink-0 neo-raised hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-extrabold text-text-prim flex items-center gap-2">
            <Sparkles className="size-5.5 text-text-prim animate-pulse" />
            AI Content Optimization
          </h1>
          <p className="text-text-sec text-xs mt-1">
            Review detailed strengths, address gaps, and apply action-first rewrites for {detail?.file_name || 'your resume'}.
          </p>
        </div>
      </div>

      {/* Seniority & Performance Summary Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Experience metrics card */}
        <div className="p-5 rounded-2xl flex items-center gap-4 neo-raised">
          <div className="p-3 rounded-2xl squircle-icon-bg text-text-prim shrink-0">
            <TrendingUp className="size-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Quantification Score</p>
            <p className="text-2xl font-mono font-extrabold text-text-prim mt-0.5">{analysis.quantification_score ?? 70}%</p>
          </div>
        </div>
 
        {/* Action verbs card */}
        <div className="p-5 rounded-2xl flex items-center gap-4 neo-raised">
          <div className="p-3 rounded-2xl squircle-icon-bg text-text-prim shrink-0">
            <CheckCircle2 className="size-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">Action Verb Density</p>
            <p className="text-2xl font-mono font-extrabold text-text-prim mt-0.5">{analysis.action_verb_score ?? 75}%</p>
          </div>
        </div>
 
        {/* Experience & Level */}
        <div className="p-5 rounded-2xl flex items-center gap-4 neo-raised">
          <div className="p-3 rounded-2xl squircle-icon-bg text-text-prim shrink-0">
            <Sparkles className="size-5.5" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">AI Seniority Level</p>
            <p className="text-sm font-heading font-extrabold text-text-prim mt-1 uppercase tracking-wider">
              {analysis.seniority_level || 'Mid-Level'} ({analysis.years_of_experience || 3} Yrs Exp)
            </p>
          </div>
        </div>
      </div>

      {/* Red flags if any */}
      {redFlags.length > 0 && (
        <div className="p-5 rounded-2xl flex gap-3 text-left border border-zinc-900 bg-zinc-950 neo-sunken">
          <AlertTriangle className="size-5 text-zinc-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">Compliance Concerns (Red Flags)</h4>
            <ul className="list-disc pl-4 space-y-1.5 mt-2 text-xs text-zinc-400">
              {redFlags.map((flag: string, idx: number) => (
                <li key={idx} className="leading-relaxed">{flag}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Improvement Suggestions Accordion Component */}
      <div className="p-6 rounded-2xl neo-raised">
        <ImprovementSuggestions 
          suggestions={suggestions}
          onApplyFix={handleApplyFix}
          isFixing={enhanceMutation.isPending}
        />
      </div>

      {/* Strengths & Gaps lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths card */}
        <div className="p-5 rounded-2xl space-y-4 neo-raised">
          <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-zinc-300" />
            Detected Content Strengths
          </h3>
          <ul className="space-y-3">
            {strengths.map((str: any, idx: number) => (
              <li key={idx} className="text-xs text-text-sec leading-relaxed flex gap-2.5 items-start">
                <span className="text-zinc-300 font-bold shrink-0 mt-0.5">✓</span>
                <span>{formatTextOrObject(str)}</span>
              </li>
            ))}
          </ul>
        </div>
 
        {/* Gaps card */}
        <div className="p-5 rounded-2xl space-y-4 neo-raised">
          <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-zinc-650" />
            Areas For Compliance Refinement
          </h3>
          <ul className="space-y-3">
            {gaps.map((gap: any, idx: number) => (
              <li key={idx} className="text-xs text-text-sec leading-relaxed flex gap-2.5 items-start">
                <span className="text-zinc-500 font-bold shrink-0 mt-0.5">⚠</span>
                <span>{formatTextOrObject(gap)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}