import { useNavigate } from 'react-router-dom';
import { useResumeListQuery } from '@/features/resume/hooks/useResumeQueries';
import { useJobRecommendations, useSavedJobsQuery, useSaveJobMutation, useUnsaveJobMutation } from '@/features/jobs/hooks/useJobQueries';
import { JobCard } from '@/features/jobs/components/JobCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, FileText, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function JobHighlightCarousel() {
  const navigate = useNavigate();

  // 1. Fetch resume list
  const { data: resumes, isLoading: resumesLoading } = useResumeListQuery();
  const activeResume = resumes && resumes.length > 0 ? resumes[0] : null;
  const resumeId = activeResume?.id;

  // 2. Fetch recommendations (only enabled if resumeId exists)
  const { data: recommendations, isLoading: recsLoading } = useJobRecommendations(resumeId);

  // 3. Fetch saved jobs list
  const { data: savedJobs } = useSavedJobsQuery();
  const savedJobIds = new Set(savedJobs?.map((s: any) => s.job.id) || []);

  // 4. Mutations
  const saveMutation = useSaveJobMutation();
  const unsaveMutation = useUnsaveJobMutation();

  const handleToggleSave = (jobId: string, isSaved: boolean) => {
    if (isSaved) {
      unsaveMutation.mutate(jobId, {
        onSuccess: () => toast.success('Job removed from wishlist'),
        onError: () => toast.error('Failed to unsave job'),
      });
    } else {
      saveMutation.mutate(jobId, {
        onSuccess: () => toast.success('Job saved to wishlist!'),
        onError: () => toast.error('Failed to save job'),
      });
    }
  };

  const isLoading = resumesLoading || (resumeId && recsLoading);

  if (isLoading) {
    return (
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-44 bg-bg-elevated" />
          <Skeleton className="h-4 w-16 bg-bg-elevated" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2].map((i) => (
            <div key={i} className="min-w-[280px] p-5 bg-bg-surface border border-border-def rounded-xl flex flex-col justify-between h-44">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16 bg-bg-elevated" />
                  <Skeleton className="h-4 w-12 bg-bg-elevated rounded-full" />
                </div>
                <Skeleton className="h-5 w-3/4 bg-bg-elevated" />
              </div>
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-5 w-16 bg-bg-elevated" />
                <Skeleton className="h-5 w-20 bg-bg-elevated" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Case A: No resumes uploaded yet - show promotional call to action
  if (!activeResume) {
    return (
      <div className="space-y-4 text-left">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-heading font-bold text-text-prim flex items-center gap-2">
            <Briefcase className="size-4.5 text-text-muted" />
            AI Recommended Jobs
          </h2>
        </div>

        <div className="p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300 relative overflow-hidden group border border-border-subtle interactive-card hover:scale-100 hover:translate-y-0 active:scale-100 shadow-[6px_6px_16px_rgba(0,0,0,0.5),-4px_-4px_12px_rgba(255,255,255,0.01)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none group-hover:bg-white/10 transition-colors" />
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl squircle-icon-bg text-text-prim shrink-0">
              <FileText className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-prim flex items-center gap-1.5">
                Tailored AI Recommendations
                <Sparkles className="size-4 text-text-prim fill-text-prim/10 animate-pulse" />
              </h3>
              <p className="text-text-sec text-xs mt-1.5 leading-relaxed max-w-xl">
                Upload your resume to automatically compare your skill overlap and discover real developer job openings matching your profile, along with ATS compatibility scoring.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/app/resumes')}
            className="flex items-center gap-2 bg-text-prim hover:bg-zinc-200 hover:text-black hover:shadow-[0_0_18px_rgba(255,255,255,0.12)] text-bg-void hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] px-4 py-2.5 rounded-lg text-xs font-bold font-heading shrink-0 cursor-pointer shadow-md transition-all duration-150"
          >
            <Upload className="size-4" />
            Upload Resume
          </button>
        </div>
      </div>
    );
  }

  const jobRecs = recommendations || [];

  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-heading font-bold text-text-prim flex items-center gap-2">
          <Briefcase className="size-4.5 text-text-muted" />
          AI Recommended Jobs
        </h2>
        {jobRecs.length > 0 && (
          <button 
            onClick={() => navigate('/app/jobs')} 
            className="text-xs font-semibold text-text-sec hover:text-text-prim hover:underline cursor-pointer"
          >
            View all →
          </button>
        )}
      </div>

      {jobRecs.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2 select-none snap-x snap-mandatory no-scrollbar scroll-smooth">
          {jobRecs.map((rec: any) => {
            const isSaved = savedJobIds.has(rec.job.id);
            return (
              <div key={rec.job.id} className="snap-center min-w-[280px] w-[280px] md:w-[320px] flex shrink-0">
                <JobCard 
                  job={rec.job}
                  matchScore={rec.match_score}
                  isSaved={isSaved}
                  onToggleSave={() => handleToggleSave(rec.job.id, isSaved)}
                  onClick={() => navigate(`/app/jobs`)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-bg-surface border border-border-def rounded-xl text-text-muted">
          <p className="text-sm">We couldn't find any job recommendations matching your resume skills.</p>
          <button 
            onClick={() => navigate('/app/jobs')}
            className="mt-3 text-xs font-semibold text-text-sec hover:text-text-prim hover:underline cursor-pointer"
          >
            Browse all jobs list →
          </button>
        </div>
      )}
    </div>
  );
}