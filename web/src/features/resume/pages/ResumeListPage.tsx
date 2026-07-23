import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResumeListQuery, useDeleteResumeMutation } from '../hooks/useResumeQueries';
import { ResumeCard } from '../components/ResumeCard';
import { FileText, Search, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function ResumeListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'ats'>('date');
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);

  const { data: resumes, isLoading } = useResumeListQuery();
  const deleteMutation = useDeleteResumeMutation();

  const handleConfirmDelete = () => {
    if (!deleteResumeId) return;

    deleteMutation.mutate(deleteResumeId, {
      onSuccess: () => {
        toast.success('Resume deleted successfully.');
        setDeleteResumeId(null);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || 'Failed to delete resume.');
        setDeleteResumeId(null);
      }
    });
  };

  const filteredResumes = resumes
    ?.filter((res: any) =>
      res.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortBy === 'ats') {
        return (b.ats_score || 0) - (a.ats_score || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }) || [];

  return (
    <div className="space-y-8 animate-fade-in duration-300">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border-subtle pb-5 text-left">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-text-prim">Resume Library</h1>
          <p className="text-text-sec text-xs mt-1">
            Manage your uploaded resumes, check ATS scoring compliance, and review AI enhancements.
          </p>
        </div>
        <button
          onClick={() => navigate('/app/resumes/upload')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold font-heading shrink-0 cursor-pointer transition-all duration-150 neo-raised neo-raised-hover neo-raised-active text-text-prim"
        >
          <Plus className="size-4" />
          Add Resume
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-left">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 bg-bg-surface border border-border-def rounded-xl flex flex-col justify-between h-48 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="size-10 bg-bg-elevated rounded-xl" />
                <div className="h-6 w-12 bg-bg-elevated rounded" />
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-4 bg-bg-elevated rounded w-3/4" />
                <div className="h-3 bg-bg-elevated rounded w-1/2" />
              </div>
              <div className="h-8 bg-bg-elevated rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : resumes && resumes.length > 0 ? (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center text-text-muted">
                <Search className="size-4" />
              </span>
              <input
                type="text"
                placeholder="Search resumes by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 bg-zinc-950 border border-zinc-900 focus:border-zinc-750 hover:border-zinc-800 rounded-xl pl-9 pr-4 text-xs text-text-prim placeholder-text-disabled outline-none transition-all neo-sunken"
              />
            </div>

            {/* Sorting trigger */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">Sort by</span>
              <div className="flex border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950 h-9 p-0.5">
                <button
                  onClick={() => setSortBy('date')}
                  className={`px-3.5 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                    sortBy === 'date'
                      ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-800/50'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => setSortBy('ats')}
                  className={`px-3.5 text-xs font-bold transition-all cursor-pointer rounded-lg ${
                    sortBy === 'ats'
                      ? 'bg-zinc-900 text-zinc-100 shadow-sm border border-zinc-800/50'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40'
                  }`}
                >
                  ATS Score
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {filteredResumes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredResumes.map((res: any) => (
                <ResumeCard
                  key={res.id}
                  resume={res}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setDeleteResumeId(res.id);
                  }}
                  onClick={() => {
                    if (res.parse_status === 'success') {
                      navigate(`/app/resumes/${res.id}`);
                    } else if (res.parse_status === 'pending' || res.parse_status === 'processing') {
                      toast.info('This resume is currently being analyzed. Please wait...');
                    } else {
                      toast.error('Parsing failed for this resume. Please upload a fresh copy.');
                    }
                  }}
                  onAnalyze={(e) => {
                    e.stopPropagation();
                    navigate(`/app/resumes/${res.id}/analysis`);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-bg-surface border border-border-def rounded-xl text-text-muted">
              <p className="text-sm">No resumes matching search filter found.</p>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 md:p-16 text-center rounded-2xl flex flex-col items-center justify-center max-w-xl mx-auto neo-raised">
          <div className="size-14 rounded-2xl squircle-icon-bg text-text-muted shrink-0 flex items-center justify-center shadow-md">
            <FileText className="size-6" />
          </div>
          <h3 className="text-base font-bold text-text-prim mt-5">No resumes in your library</h3>
          <p className="text-text-sec text-xs mt-1.5 leading-relaxed max-w-sm">
            Upload your resume PDF to compare ATS match percentage, parse technical skills, and analyze critical content gaps.
          </p>
          <button
            onClick={() => navigate('/app/resumes/upload')}
            className="mt-6 px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all duration-150 neo-raised neo-raised-hover neo-raised-active text-text-prim"
          >
            Upload Resume PDF
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal (Shadcn-style monochrome sheet popup) */}
      {deleteResumeId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in duration-200">
          <div className="w-full max-w-md p-6 text-left space-y-6 rounded-2xl neo-raised">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shrink-0 text-zinc-400">
                <AlertTriangle className="size-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-bold text-text-prim">Delete Resume?</h3>
                <p className="text-text-sec text-xs leading-relaxed">
                  This action is permanent. It will delete this resume record and purge all indexed vector representations from the search index.
                </p>
              </div>
              <button 
                onClick={() => setDeleteResumeId(null)}
                className="p-1 rounded hover:bg-zinc-800 text-text-muted hover:text-text-prim cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
 
            <div className="flex justify-end gap-3 border-t border-zinc-900 pt-4">
              <button
                onClick={() => setDeleteResumeId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-150 neo-raised neo-raised-hover neo-raised-active text-text-prim"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 hover:border-zinc-700 text-xs font-bold rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}