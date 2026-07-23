import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSavedJobs, useUnsaveJobMutation } from '../hooks/useJobQueries';
import { JobCard } from '../components/JobCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Bookmark, 
  Loader2, 
  AlertCircle,
  SlidersHorizontal 
} from 'lucide-react';
import { toast } from 'sonner';

export function SavedJobsPage() {
  const navigate = useNavigate();

  // Sorting state: 'newest' | 'score' | 'alphabetical'
  const [sortBy, setSortBy] = useState<string>('newest');

  // Queries
  const { data: savedJobs = [], isLoading, isError, refetch } = useSavedJobs();

  // Mutations
  const unsaveMutation = useUnsaveJobMutation();

  const handleUnsave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unsaveMutation.mutateAsync(jobId);
      toast.success('Job removed from saved wishlist.');
    } catch (err) {
      toast.error('Failed to unsave job.');
    }
  };

  // Sort jobs list
  const sortedJobs = [...savedJobs].sort((a: any, b: any) => {
    if (sortBy === 'score') {
      return (b.match_score || 0) - (a.match_score || 0);
    }
    if (sortBy === 'alphabetical') {
      return (a.job?.title || '').localeCompare(b.job?.title || '');
    }
    // Default: newest first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-8 text-left pb-12 select-none animate-fade-in duration-300">
      {/* Header section with Back button */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/jobs')}
            className="p-2.5 rounded-xl text-text-muted hover:text-text-prim cursor-pointer transition-all neo-raised neo-raised-hover neo-raised-active"
            title="Back to jobs arena"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider block leading-none">
              Jobs Arena
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-text-prim flex items-center gap-2.5 font-heading uppercase mt-1.5">
              Saved Wishlist
            </h1>
          </div>
        </div>

        {/* Job count badge */}
        {!isLoading && !isError && sortedJobs.length > 0 && (
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider neo-sunken rounded-lg px-3 py-1.5">
            {sortedJobs.length} saved
          </span>
        )}
      </div>

      {/* Toolbar Options (Filters & Sorting) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-4.5 neo-raised">
        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <SlidersHorizontal className="size-3.5 text-zinc-500" />
          Wishlist Controls
        </span>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:justify-end">
          {/* Select Sorting options */}
          <div className="w-full sm:w-52">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="!w-full neo-sunken !border-0 focus:!ring-0 rounded-xl px-3.5 !py-5 text-xs text-text-prim outline-none transition-all !h-[38px]">
                <SelectValue placeholder="Sort Wishlist" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                <SelectItem value="newest" className="cursor-pointer focus:bg-zinc-900">Newest Saved</SelectItem>
                <SelectItem value="score" className="cursor-pointer focus:bg-zinc-900">Highest Match Score</SelectItem>
                <SelectItem value="alphabetical" className="cursor-pointer focus:bg-zinc-900">Alphabetical (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Saved Jobs list grid */}
      <div className="space-y-4 no-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 rounded-2xl overflow-hidden neo-raised">
            <Loader2 className="size-7 text-zinc-400 animate-spin" />
            <p className="text-xs text-text-muted">Loading saved wishlist items...</p>
          </div>
        ) : isError ? (
          <div className="p-8 flex flex-col items-center text-center gap-4 rounded-2xl neo-raised">
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/30">
              <AlertCircle className="size-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-text-prim">Error Loading Wishlist</h3>
              <p className="text-[10px] text-text-muted mt-1">
                There was an issue fetching your saved job listings.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/40 text-rose-400 text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all active:scale-[0.97] cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center p-6 overflow-hidden rounded-2xl neo-raised">
            <div className="p-3 rounded-xl neo-sunken">
              <Bookmark className="size-5 text-text-muted" />
            </div>
            <p className="text-xs text-text-prim font-bold">No saved jobs found</p>
            <p className="text-[10px] text-text-muted max-w-sm leading-relaxed">
              Browse the AI-Powered Jobs Arena and click the bookmark heart icon to save listings here for later review!
            </p>
            <button
              onClick={() => navigate('/app/jobs')}
              className="mt-4 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer uppercase tracking-wider active:scale-[0.97]"
            >
              Explore Arena
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedJobs.map((item: any) => {
              const job = item.job;
              const score = item.match_score;
              return (
                <JobCard
                  key={item.id}
                  job={job}
                  matchScore={score}
                  isSaved={true}
                  onToggleSave={(e) => handleUnsave(job.id, e)}
                  onClick={() => navigate(`/app/jobs/${job.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}