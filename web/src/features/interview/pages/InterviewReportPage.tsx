import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInterviewReportQuery, useInterviewFeedbackQuery } from '../hooks/useInterviewQueries';
import { ReportHeroCard } from '../components/ReportHeroCard';
import { RadarScoreChart } from '../components/RadarScoreChart';
import { QuestionAccordion } from '../components/QuestionAccordion';
import { interviewApi } from '@/api/interview.api';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  TrendingUp, 
  ListChecks, 
  RotateCcw,
  BookOpen,
  ArrowRight
} from 'lucide-react';

export function InterviewReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: report, isLoading: reportLoading, error: reportError } = useInterviewReportQuery(id || '');
  const { data: feedbacks = [], isLoading: feedbackLoading } = useInterviewFeedbackQuery(id || '');

  // 1. PDF Export Trigger
  const handleExportPdf = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      const response = await interviewApi.getTranscript(id);
      
      // Create a blob URL and download it
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Transcript downloaded successfully.');
    } catch (err) {
      console.error('Failed to download transcript:', err);
      toast.error('Failed to export transcript PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = reportLoading || feedbackLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse text-left py-8">
        <div className="h-48 border border-zinc-900 rounded-2xl neo-raised" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 border border-zinc-900 rounded-2xl neo-raised" />
          <div className="h-64 border border-zinc-900 rounded-2xl neo-raised" />
        </div>
        <div className="h-40 border border-zinc-900 rounded-2xl neo-raised" />
      </div>
    );
  }

  if (reportError || !report) {
    return (
      <div className="p-8 text-center text-text-muted space-y-4">
        <p>Failed to load the interview performance report.</p>
        <button 
          onClick={() => navigate('/app/interview')}
          className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
        >
          Back to Setup
        </button>
      </div>
    );
  }

  // Format creation date
  const formattedDate = report.created_at 
    ? new Date(report.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : undefined;

  // Compile duration display
  const durationSec = report.duration_seconds || 0;
  const durationString = durationSec > 0
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : undefined;

  return (
    <div className="space-y-8 text-left pb-16 animate-fade-in">
      
      {/* Back Button Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/interview')}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-prim transition-colors cursor-pointer group font-bold"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </button>
 
        <button
          onClick={() => navigate('/app/interview')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-300 text-xs font-bold cursor-pointer transition-all neo-raised neo-raised-hover neo-raised-active"
        >
          <RotateCcw className="size-3.5" />
          New Interview Setup
        </button>
      </div>

      {/* Hero Header Card */}
      <ReportHeroCard
        role={report.title || report.role || 'Software Engineer'}
        type={report.type || 'Technical'}
        score={report.overall_score || 50}
        duration={durationString}
        createdAt={formattedDate}
        onExportPdf={handleExportPdf}
        isExporting={isExporting}
      />

      {/* Grid: Dimensions & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Radar Scores Grid */}
        <div className="lg:col-span-7">
          <RadarScoreChart scores={report.dimension_scores || {
            technical_accuracy: 50,
            communication: 50,
            depth: 50,
            structure: 50,
            relevance: 50
          }} />
        </div>

        {/* Improvement Plan Recommendations */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl text-left neo-raised">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="size-4 text-zinc-400" />
                Improvement Recommendations
              </h3>
              <p className="text-[10px] text-text-disabled uppercase font-mono mt-0.5">AI-calibrated target areas</p>
            </div>

            {report.improvement_plan && report.improvement_plan.length > 0 ? (
              <div className="space-y-3 pt-2">
                {report.improvement_plan.map((plan: string, idx: number) => (
                  <div key={idx} className="flex gap-2.5 items-start">
                    <span className="flex size-5 shrink-0 rounded-full bg-zinc-850 text-zinc-300 font-mono text-[10px] font-bold items-center justify-center border border-zinc-700 select-none">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-text-sec leading-relaxed">
                      {plan}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-text-muted text-xs">
                <p>No major improvements identified. Keep maintaining this level of depth!</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle/50 flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted flex-1">
              <BookOpen className="size-4 text-text-disabled" />
              <span>Explore community quiz archives.</span>
            </div>
            <button
              onClick={() => navigate('/app/quiz')}
              className="w-full sm:w-auto px-4 py-2 text-text-prim text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer group neo-raised neo-raised-hover neo-raised-active"
            >
              <span>Practice Quizzes</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Questions Report */}
      <div className="space-y-4 pt-4">
        <div className="border-b border-border-subtle pb-3">
          <h2 className="text-base font-heading font-extrabold text-text-prim flex items-center gap-2">
            <ListChecks className="size-5 text-zinc-400" />
            Comprehensive Q&A Assessment Timeline
          </h2>
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
            Individual question evaluations & suggested guidelines
          </p>
        </div>

        {feedbacks && feedbacks.length > 0 ? (
          <QuestionAccordion questions={feedbacks} />
        ) : (
          <div className="p-8 bg-bg-surface border border-border-def rounded-xl text-center text-text-muted text-xs">
            <p>No detailed answers captured for this session.</p>
          </div>
        )}
      </div>

    </div>
  );
}