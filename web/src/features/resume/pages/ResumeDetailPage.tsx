import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  useResumeDetailQuery, 
  useResumeAtsScoreQuery, 
  useResumeSkillsQuery, 
  useResumeAnalysisQuery,
  useDeleteResumeMutation 
} from '../hooks/useResumeQueries';
import { AtsScorePanel } from '../components/AtsScorePanel';
import { SkillsGrid } from '../components/SkillsGrid';
import { 
  ArrowLeft, 
  Trash2, 
  Sparkles, 
  Layers, 
  Trophy, 
  Grid,
  FileText,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatTextOrObject } from '@/lib/utils';

export function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'skills'>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: detail, isLoading: detailLoading } = useResumeDetailQuery(id || '');
  const { data: atsData, isLoading: atsLoading } = useResumeAtsScoreQuery(id || '');
  const { data: skillsData, isLoading: skillsLoading } = useResumeSkillsQuery(id || '');
  const { data: analysisData, isLoading: analysisLoading } = useResumeAnalysisQuery(id || '');
  
  const deleteMutation = useDeleteResumeMutation();

  const handleSoftDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteResume = () => {
    if (!id) return;
    setShowDeleteDialog(false);

    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Resume deleted successfully.');
        navigate('/app/resumes');
      },
      onError: () => {
        toast.error('Failed to delete resume.');
      }
    });
  };

  const isLoading = detailLoading || atsLoading || skillsLoading || analysisLoading;

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
        <div className="h-48 bg-bg-surface border border-border-def rounded-xl" />
        <div className="space-y-4">
          <div className="h-8 bg-bg-elevated rounded w-1/4" />
          <div className="h-32 bg-bg-surface border border-border-def rounded-xl" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>Resume record not found.</p>
        <button onClick={() => navigate('/app/resumes')} className="mt-4 text-xs font-semibold text-text-prim hover:underline cursor-pointer">
          Back to Library
        </button>
      </div>
    );
  }

  const formattedDate = new Date(detail.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const parsedAnalysis = analysisData?.analysis || {};
  const strengths = parsedAnalysis.strengths || [];
  const gaps = parsedAnalysis.gaps || [];

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="flex items-start gap-3.5 min-w-0">
          <button
            onClick={() => navigate('/app/resumes')}
            className="p-2 rounded-xl cursor-pointer text-text-muted hover:text-text-prim transition-all shrink-0 mt-0.5 neo-raised hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="space-y-1.5 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-heading font-extrabold text-text-prim leading-tight break-words flex items-start gap-2">
              <FileText className="size-5 text-text-muted mt-1 shrink-0" />
              <span className="break-all sm:break-normal">{detail.file_name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-sec font-mono">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {formattedDate}
              </span>
              <span className="hidden sm:inline text-text-disabled">·</span>
              <span>{detail.word_count || 0} words</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate(`/app/resumes/${id}/analysis`)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-heading cursor-pointer transition-all duration-150 neo-raised neo-raised-hover neo-raised-active text-text-prim"
          >
            <Sparkles className="size-3.5" />
            AI Rewrite Fixes
            <ArrowUpRight className="size-3" />
          </button>
          <button
            onClick={handleSoftDelete}
            className="p-2.5 rounded-xl cursor-pointer transition-all duration-150 neo-raised neo-raised-hover neo-raised-active text-text-muted hover:text-text-prim"
            title="Delete Resume"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* ATS score panel breakdown */}
      <AtsScorePanel 
        atsScore={atsData?.ats_score ?? detail.ats_score ?? 70}
        keywordsFound={atsData?.keywords_found || []}
        keywordsMissing={atsData?.keywords_missing || []}
        formattingScore={parsedAnalysis.action_verb_score || 80}
        readabilityScore={parsedAnalysis.quantification_score || 75}
        sectionScore={90}
      />

      {/* Tabs list */}
      <div className="space-y-6">
        <div className="flex items-center gap-1.5 border-b border-border-subtle pb-2">
          {[
            { id: 'overview', label: 'Overview Analysis', icon: Trophy },
            { id: 'sections', label: 'Structured Sections', icon: Layers },
            { id: 'skills', label: 'Parsed Skills', icon: Grid }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-bold font-mono uppercase tracking-wider border-b-2 -mb-2.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive 
                    ? 'border-text-prim text-text-prim font-bold' 
                    : 'border-transparent text-text-muted hover:text-text-sec'
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Suitable Roles summary */}
            {parsedAnalysis.suitable_roles && parsedAnalysis.suitable_roles.length > 0 && (
              <div className="p-5 rounded-2xl text-left space-y-3 neo-raised">
                <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">Suitable Job Matches</h3>
                <div className="flex flex-wrap gap-2">
                  {parsedAnalysis.suitable_roles.map((role: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 text-xs font-mono font-bold bg-zinc-950 border border-zinc-900 text-zinc-350 rounded-xl">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Gaps lists */}            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="p-5 rounded-2xl text-left space-y-4 neo-raised">
                <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-zinc-300" />
                  Identified Strengths
                </h3>
                <ul className="space-y-3">
                  {strengths.length > 0 ? (
                    strengths.map((str: any, idx: number) => (
                      <li key={idx} className="text-xs text-text-sec leading-relaxed flex gap-2.5 items-start">
                        <span className="text-zinc-300 font-bold shrink-0 mt-0.5">✓</span>
                        <span>{formatTextOrObject(str)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-text-disabled italic">No high-impact strengths extracted.</li>
                  )}
                </ul>
              </div>
 
              {/* Gaps */}
              <div className="p-5 rounded-2xl text-left space-y-4 neo-raised">
                <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-zinc-650" />
                  ATS Discrepancies & Gaps
                </h3>
                <ul className="space-y-3">
                  {gaps.length > 0 ? (
                    gaps.map((gap: any, idx: number) => (
                      <li key={idx} className="text-xs text-text-sec leading-relaxed flex gap-2.5 items-start">
                        <span className="text-zinc-500 font-bold shrink-0 mt-0.5">⚠</span>
                        <span>{formatTextOrObject(gap)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-text-disabled italic">No significant compliance gaps flagged.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Sections Tab Content */}
        {activeTab === 'sections' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {detail.sections && detail.sections.length > 0 ? (
              detail.sections.map((sec: any) => (
                <div key={sec.id} className="p-5 rounded-2xl text-left space-y-3 transition-colors neo-raised neo-raised-hover">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                    <span className="text-xs font-mono font-bold text-text-prim uppercase tracking-wider">{sec.section_type}</span>
                    <span className="text-[10px] font-mono text-text-muted uppercase">{sec.word_count || 0} words</span>
                  </div>
                  <p className="text-xs text-text-sec leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto custom-scrollbar font-mono">
                    {sec.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center rounded-2xl text-text-muted text-xs neo-raised">
                No sections extracted.
              </div>
            )}
          </div>
        )}

        {/* Skills Tab Content */}
        {activeTab === 'skills' && (
          <div className="p-6 rounded-2xl neo-raised">
            <SkillsGrid skills={skillsData?.skills || []} />
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-900 text-text-prim shadow-[8px_8px_24px_rgba(0,0,0,0.6)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold font-heading uppercase text-left">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-text-muted text-left">
              Are you sure you want to delete this resume? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-text-sec hover:text-text-prim rounded-xl transition-all cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteResume}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}