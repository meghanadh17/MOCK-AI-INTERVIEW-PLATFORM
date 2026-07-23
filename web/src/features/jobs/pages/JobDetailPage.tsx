import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useResumeListQuery } from '@/features/resume/hooks/useResumeQueries';
import { 
  useJobDetail, 
  useJobMatchScore, 
  useSavedJobs, 
  useSaveJobMutation, 
  useUnsaveJobMutation 
} from '../hooks/useJobQueries';
import { MatchGaugePanel } from '../components/MatchGaugePanel';
import { SkillMatchChips } from '../components/SkillMatchChips';
import { JobDescriptionExpander } from '../components/JobDescriptionExpander';
import { 
  ArrowLeft, 
  Heart, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Loader2, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Find resumeId from search params or fallback
  const [resumeId, setResumeId] = useState<string>(searchParams.get('resumeId') || '');

  // Load Resumes list as a fallback
  const { data: resumes = [], isLoading: resumesLoading } = useResumeListQuery();

  useEffect(() => {
    if (resumes.length > 0 && !resumeId) {
      const primary = resumes.find((r: any) => r.is_primary) || resumes[0];
      setResumeId(primary.id);
    }
  }, [resumes, resumeId]);

  // Queries
  const { data: job, isLoading: jobLoading, isError: jobError } = useJobDetail(id);
  const { data: matchScoreData, isLoading: matchLoading } = useJobMatchScore(
    resumeId || undefined,
    id || undefined
  );
  const { data: savedJobs = [], isLoading: savedLoading } = useSavedJobs();

  // Check if job is currently saved in wishlist
  const isSaved = savedJobs.some((sj: any) => sj.job?.id === id || sj.job_id === id);

  // Mutations
  const saveMutation = useSaveJobMutation();
  const unsaveMutation = useUnsaveJobMutation();

  const handleToggleSave = async () => {
    if (!id) return;
    try {
      if (isSaved) {
        await unsaveMutation.mutateAsync(id);
        toast.success('Job removed from wishlist.');
      } else {
        await saveMutation.mutateAsync(id);
        toast.success('Job saved to wishlist.');
      }
    } catch (err) {
      toast.error('Failed to update wishlist.');
    }
  };

  const handleApply = () => {
    toast.success(`Redirecting to apply for position at ${job?.company || 'Company'}...`);
    // Mock open external window
    setTimeout(() => {
      window.open('https://google.com/search?q=' + encodeURIComponent(`${job?.title} at ${job?.company}`), '_blank');
    }, 800);
  };

  const isLoading = jobLoading || resumesLoading || (resumeId && matchLoading) || savedLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-left">
        <Loader2 className="size-8 text-zinc-450 animate-spin" />
        <p className="text-xs text-text-muted">Loading job descriptions and calculating compatibility...</p>
      </div>
    );
  }

  if (jobError || !job) {
    return (
      <div className="p-8 border border-zinc-900 bg-zinc-950/40 text-center gap-4 max-w-lg mx-auto rounded-2xl shadow-sm text-left">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-xs text-text-prim font-bold">Failed to load job listing</p>
            <p className="text-[10px] text-text-muted mt-1">
              The requested job details are unavailable or the record was removed.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/app/jobs')}
          className="mt-5 flex items-center gap-1 px-4 py-2 bg-zinc-900 border border-zinc-800 text-text-prim hover:text-white hover:bg-zinc-850 text-xs font-bold rounded-xl cursor-pointer transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Listings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16 select-none">
      {/* Header with back button */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/jobs')}
            className="relative group p-2.5 rounded-xl text-text-muted hover:text-text-prim cursor-pointer transition-all active:scale-[0.97] neo-raised neo-raised-hover neo-raised-active"
            title="Back to listings"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider block leading-none">
              Job Details
            </span>
            <h1 className="text-lg font-extrabold tracking-tight text-text-prim flex items-center gap-2 font-heading uppercase truncate mt-1.5 max-w-[200px] sm:max-w-md">
              {job.title}
            </h1>
          </div>
        </div>

        <button
          onClick={handleToggleSave}
          className={cn(
            'relative group flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98]',
            isSaved
              ? 'bg-rose-955/20 border border-rose-500/20 text-rose-400 shadow-[inset_1px_1px_2.5px_rgba(0,0,0,0.4)]'
              : 'text-text-muted hover:text-text-sec neo-raised neo-raised-hover neo-raised-active'
          )}
        >
          <Heart className={cn('size-3.5', isSaved && 'fill-rose-400 text-rose-400')} />
          <span>{isSaved ? 'Saved to Wishlist' : 'Save Job'}</span>
        </button>
      </div>

      {/* Split screen content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Score card and Apply CTA */}
        <div className="lg:col-span-5 space-y-6">
          {matchScoreData ? (
            <MatchGaugePanel
              matchScore={matchScoreData.match_score}
              skillsOverlapCount={matchScoreData.skills_overlap?.length || 0}
              skillsTotalCount={(matchScoreData.skills_overlap?.length || 0) + (matchScoreData.missing_skills?.length || 0)}
              experienceLevel={job.experience_level || 'Not Specified'}
              location={job.location || 'Remote'}
              atsPrediction={matchScoreData.ats_prediction}
            />
          ) : (
            <div className="relative p-5 rounded-2xl text-center space-y-2.5 neo-raised">
              <AlertCircle className="size-5 text-zinc-500 mx-auto" />
              <p className="text-[10px] text-text-muted uppercase font-mono leading-relaxed">
                No resume selected to compute match index metrics.
              </p>
              <button
                onClick={() => navigate('/app/jobs')}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-extrabold uppercase rounded-lg text-text-prim hover:text-white transition-all cursor-pointer shadow-sm"
              >
                Go Select Resume Context
              </button>
            </div>
          )}

          {/* Sticky CTA Card */}
          <div className="relative p-6 rounded-2xl text-center space-y-4 neo-raised">
            <div className="text-left space-y-1">
              <span className="text-[8px] font-mono text-text-muted uppercase tracking-wider block">Interested?</span>
              <p className="text-xs text-text-sec">Submit your profile to apply directly for this job.</p>
            </div>
            <button
              onClick={handleApply}
              className="w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.99] shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
            >
              <ExternalLink className="size-4 text-zinc-950" />
              <span>Apply to Job Position</span>
            </button>
          </div>
        </div>

        {/* Right Side: Role details, skills overlap and expander */}
        <div className="lg:col-span-7 space-y-6">
          {/* Company Hero / Role header details */}
          <div className="relative p-6 rounded-2xl space-y-4 text-left neo-raised">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                {job.company}
              </span>
              <h2 className="text-lg font-bold font-heading text-text-prim uppercase tracking-wide">
                {job.title}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
              {job.location && (
                <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-900 text-text-sec px-3 py-1.5 rounded-md flex items-center gap-1 shadow-[inset_1px_1px_2.5px_rgba(0,0,0,0.4)]">
                  <MapPin className="size-3 text-zinc-500" />
                  {job.location}
                </span>
              )}
              {job.salary_range && (
                <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-900 text-text-sec px-3 py-1.5 rounded-md flex items-center gap-1 shadow-[inset_1px_1px_2.5px_rgba(0,0,0,0.4)]">
                  <DollarSign className="size-3 text-zinc-500" />
                  {job.salary_range}
                </span>
              )}
              {job.experience_level && (
                <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-900 text-text-sec px-3 py-1.5 rounded-md flex items-center gap-1 shadow-[inset_1px_1px_2.5px_rgba(0,0,0,0.4)] uppercase">
                  <Briefcase className="size-3 text-zinc-500" />
                  {job.experience_level}
                </span>
              )}
            </div>
          </div>

          {/* Skill match chips */}
          {matchScoreData && (
            <SkillMatchChips
              skillsOverlap={matchScoreData.skills_overlap || []}
              missingSkills={matchScoreData.missing_skills || []}
            />
          )}

          {/* Description Expander */}
          <JobDescriptionExpander
            description={job.description}
            requirements={job.requirements}
          />
        </div>
      </div>
    </div>
  );
}