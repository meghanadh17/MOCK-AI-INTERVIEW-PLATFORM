import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResumeListQuery } from '@/features/resume/hooks/useResumeQueries';
import { 
  useJobRecommendations, 
  useJobSearch, 
  useLiveJobSearch,
  useSavedJobs, 
  useSaveJobMutation, 
  useUnsaveJobMutation 
} from '../hooks/useJobQueries';
import { JobCard } from '../components/JobCard';
import { JobSearchBar } from '../components/JobSearchBar';
import { JobFilters } from '../components/JobFilters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Search, 
  Bookmark, 
  Loader2, 
  AlertCircle,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

export function JobsPage() {
  const navigate = useNavigate();

  // Selected Resume for recommendations
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');

  // Search and Filter States
  const [searchVal, setSearchVal] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('all');
  const [jobType, setJobType] = useState('all');

  const debouncedSearchVal = useDebounce(searchVal, 500);

  // Tab: 'recommendations' | 'search' | 'live-india'
  const [activeTab, setActiveTab] = useState<'recommendations' | 'search' | 'live-india'>('recommendations');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load Resumes
  const { data: resumes = [], isLoading: resumesLoading } = useResumeListQuery();

  // Set default resume ID once loaded
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      // Prefer primary resume
      const primary = resumes.find((r: any) => r.is_primary) || resumes[0];
      setSelectedResumeId(primary.id);
    }
  }, [resumes, selectedResumeId]);

  // Query Recommendations (only enabled if we have selectedResumeId)
  const { data: recommendations = [], isLoading: recsLoading } = useJobRecommendations(
    selectedResumeId || undefined
  );

  // Query Search
  const searchParams = {
    q: debouncedSearchVal || undefined,
    location: locationFilter || undefined,
    experience_level: experienceLevel === 'all' ? undefined : experienceLevel,
  };
  const { data: searchResults = [], isLoading: searchLoading } = useJobSearch(searchParams);

  // Query Live India Search
  const liveParams = {
    q: debouncedSearchVal || undefined,
  };
  const { data: liveSearchResults = [], isLoading: liveSearchLoading } = useLiveJobSearch(liveParams);

  // Reset page to 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchVal, locationFilter, experienceLevel, jobType, activeTab]);

  // Query Saved Jobs list to check which ones are saved
  const { data: savedJobs = [] } = useSavedJobs();
  const savedJobIds = new Set(savedJobs.map((sj: any) => sj.job?.id || sj.job_id));

  // Mutations for saving/unsaving
  const saveMutation = useSaveJobMutation();
  const unsaveMutation = useUnsaveJobMutation();

  const handleToggleSave = async (jobId: string, isCurrentlySaved: boolean) => {
    try {
      if (isCurrentlySaved) {
        await unsaveMutation.mutateAsync(jobId);
        toast.success('Job removed from wishlist.');
      } else {
        await saveMutation.mutateAsync(jobId);
        toast.success('Job saved to wishlist.');
      }
    } catch (err) {
      toast.error('Operation failed.');
    }
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setExperienceLevel('all');
    setJobType('all');
  };

  // Compile active chips for search bar display
  const activeChips = [];
  if (locationFilter) {
    activeChips.push({
      id: 'loc',
      label: `Loc: ${locationFilter}`,
      onRemove: () => setLocationFilter(''),
    });
  }
  if (experienceLevel !== 'all') {
    activeChips.push({
      id: 'exp',
      label: `Grade: ${experienceLevel}`,
      onRemove: () => setExperienceLevel('all'),
    });
  }
  if (jobType !== 'all') {
    activeChips.push({
      id: 'type',
      label: `Type: ${jobType}`,
      onRemove: () => setJobType('all'),
    });
  }

  const isListLoading = 
    activeTab === 'recommendations' 
      ? recsLoading 
      : activeTab === 'search' 
      ? searchLoading 
      : liveSearchLoading;

  const currentJobsList = 
    activeTab === 'recommendations' 
      ? recommendations.map((r: any) => ({ job: r.job, matchScore: r.match_score }))
      : activeTab === 'search'
      ? searchResults
      : liveSearchResults;

  // Pagination Calculations
  const totalItems = currentJobsList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedJobs = currentJobsList.slice(startIndex, endIndex);

  // Generate page numbers with ellipsis like [1] [2] [3] [...] [15]
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 'ellipsis', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-8 text-left pb-12 select-none animate-fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-text-prim flex items-center gap-2.5 font-heading uppercase">
            AI-Powered Jobs Arena
          </h1>
          <p className="text-[10px] text-text-muted mt-1.5 uppercase font-mono tracking-wider">
            Semantic Vector-Matching against global tech roles
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/app/jobs/saved')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-text-sec rounded-xl transition-all cursor-pointer font-heading active:scale-[0.98] shrink-0 neo-raised neo-raised-hover neo-raised-active"
          >
            <Bookmark className="size-3.5 text-indigo-400 fill-indigo-400/20" />
            <span>Saved Wishlist</span>
            <span className="bg-zinc-950 border border-zinc-900/60 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] px-2 py-0.5 rounded-full font-mono text-[10px] text-zinc-300">
              {savedJobs.length}
            </span>
            <span className="text-zinc-650 font-mono text-[9px] ml-0.5">&gt;</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Context selector & Filter Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Resume Context Selector */}
          <div className="relative p-5 rounded-2xl space-y-4 text-left neo-raised">
            <div>
              <h2 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <FileText className="size-4 text-indigo-400" />
                Resume Profile Context
              </h2>
              <p className="text-[9px] text-text-muted uppercase font-mono mt-1">AI extracts semantic recommendations</p>
            </div>

            {resumesLoading ? (
              <div className="flex items-center gap-2 py-2 text-xs text-text-muted">
                <Loader2 className="size-4 animate-spin text-zinc-400" />
                Loading profiles...
              </div>
            ) : resumes.length === 0 ? (
              <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl text-center space-y-2.5">
                <AlertCircle className="size-5 text-rose-400 mx-auto" />
                <p className="text-[10px] text-text-muted uppercase font-mono leading-relaxed">
                  No parsed resumes found in library.
                </p>
                <button
                  onClick={() => navigate('/app/resumes')}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-extrabold uppercase rounded-lg text-text-prim hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  Upload Resume →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="size-4 text-rose-400 shrink-0" />
                    <span className="text-xs text-text-prim truncate font-mono">
                      {resumes.find((r: any) => r.id === selectedResumeId)?.file_name || 'No resume selected'}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/app/resumes')}
                    className="p-1 rounded-md text-text-muted hover:text-text-prim hover:bg-zinc-900 transition-all cursor-pointer shrink-0"
                    title="Manage Resumes"
                  >
                    <Upload className="size-3.5 text-zinc-400" />
                  </button>
                </div>

                {resumes.length > 1 && (
                  <div className="flex justify-end">
                    <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                      <SelectTrigger className="!w-auto !bg-transparent !border-none text-[9px] text-indigo-400 hover:text-indigo-300 font-mono cursor-pointer !p-0 !h-auto outline-none flex items-center gap-1">
                        <SelectValue placeholder="Switch Profile" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                        {resumes.map((res: any) => (
                          <SelectItem key={res.id} value={res.id} className="cursor-pointer focus:bg-zinc-900 font-mono text-[10px]">
                            {res.file_name} {res.is_primary ? '(Primary)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Parameters Component */}
          <JobFilters
            location={locationFilter}
            setLocation={setLocationFilter}
            experienceLevel={experienceLevel}
            setExperienceLevel={setExperienceLevel}
            jobType={jobType}
            setJobType={setJobType}
            onClear={handleClearFilters}
          />
        </div>        {/* Right Column: Jobs Tabbed List */}
        <div className="lg:col-span-8 space-y-5">
          {/* Tabs Toolbar */}
          <div className="relative flex p-1 rounded-2xl w-full sm:max-w-md select-none neo-sunken">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={cn(
                'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
                activeTab === 'recommendations'
                  ? 'text-white neo-raised neo-raised-hover neo-raised-active'
                  : 'text-text-muted hover:text-text-prim'
              )}
            >
              <Sparkles className="size-3.5" />
              <span>Recommended</span>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={cn(
                'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
                activeTab === 'search'
                  ? 'text-white neo-raised neo-raised-hover neo-raised-active'
                  : 'text-text-muted hover:text-text-prim'
              )}
            >
              <Search className="size-3.5" />
              <span>Free Search</span>
            </button>
            <button
              onClick={() => setActiveTab('live-india')}
              className={cn(
                'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
                activeTab === 'live-india'
                  ? 'text-white neo-raised neo-raised-hover neo-raised-active'
                  : 'text-text-muted hover:text-text-prim'
              )}
            >
              <Sparkles className="size-3.5 text-emerald-450" />
              <span>Live India Jobs</span>
            </button>
          </div>

          {/* Job Search Input bar (Only show for Search or Live India tab) */}
          {(activeTab === 'search' || activeTab === 'live-india') && (
            <JobSearchBar
              value={searchVal}
              onChange={setSearchVal}
              onClear={() => setSearchVal('')}
              activeChips={activeTab === 'search' ? activeChips : []}
            />
          )}

          {/* Jobs List Grid */}
          <div className="space-y-4">
            {isListLoading ? (
              <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl overflow-hidden neo-raised">
                <Loader2 className="size-7 text-zinc-400 animate-spin" />
                <p className="text-xs text-text-muted">Querying matching job listings...</p>
              </div>
            ) : currentJobsList.length === 0 ? (
              <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl text-center p-6 overflow-hidden neo-raised">
                <AlertCircle className="size-6 text-text-muted" />
                <p className="text-xs text-text-prim font-bold">No matching job listings found</p>
                <p className="text-[10px] text-text-muted max-w-sm leading-relaxed">
                  {activeTab === 'recommendations'
                    ? "Try changing your active Resume context on the left or edit your profile skills to match target listings."
                    : activeTab === 'live-india'
                    ? "Try adjusting your keywords in the search bar to find live openings in India."
                    : "Try adjusting your keywords in the search bar or clearing active filter chips."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedJobs.map((item: any) => {
                    const job = item.job;
                    const score = item.matchScore;
                    const isSaved = savedJobIds.has(job.id);

                    return (
                      <JobCard
                        key={job.id}
                        job={job}
                        matchScore={score}
                        isSaved={isSaved}
                        onToggleSave={() => handleToggleSave(job.id, isSaved)}
                        onClick={() => navigate(`/app/jobs/${job.id}?resumeId=${selectedResumeId}`)}
                      />
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalItems > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-900 pt-6 mt-8 select-none">
                    {/* Showing X-Y of Z results */}
                    <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      Showing <span className="text-text-prim font-bold">{startIndex + 1}</span>-
                      <span className="text-text-prim font-bold">{endIndex}</span> of{" "}
                      <span className="text-text-prim font-bold">{totalItems}</span> results
                    </div>

                    {/* Navigation controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-text-muted hover:text-text-prim disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-150 active:scale-95 rounded-lg neo-raised neo-raised-hover neo-raised-active"
                      >
                        <ChevronLeft className="size-3.5" />
                      </button>

                      {getPageNumbers().map((pageNum, idx) => {
                        if (pageNum === 'ellipsis') {
                          return (
                            <span key={`ell-${idx}`} className="px-1.5 text-zinc-700 font-mono text-xs">
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={`page-${pageNum}`}
                            onClick={() => setCurrentPage(pageNum as number)}
                            className={cn(
                              "px-3 py-1.5 font-mono text-[10px] font-bold rounded-lg border cursor-pointer transition-all duration-150 active:scale-95",
                              currentPage === pageNum
                                ? "text-indigo-400 bg-indigo-950/20 border border-indigo-500/20 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]"
                                : "text-text-sec hover:text-text-prim neo-raised neo-raised-hover neo-raised-active"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-text-muted hover:text-text-prim disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all duration-150 active:scale-95 rounded-lg neo-raised neo-raised-hover neo-raised-active"
                      >
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}