import { FileText, Trash2, ArrowRight, Sparkles } from 'lucide-react';

interface ResumeCardProps {
  resume: {
    id: string;
    file_name: string;
    ats_score?: number;
    parse_status: string;
    word_count?: number;
    created_at: string;
    file_size_bytes?: number;
  };
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
  onAnalyze: (e: React.MouseEvent) => void;
}

export function ResumeCard({ resume, onDelete, onClick, onAnalyze }: ResumeCardProps) {
  const formattedDate = new Date(resume.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const isFailed = resume.parse_status === 'failed';
  const isPending = resume.parse_status === 'pending' || resume.parse_status === 'processing';

  return (
    <div 
      onClick={onClick}
      className="p-5 rounded-2xl cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden group text-left neo-raised neo-raised-hover neo-raised-active"
    >
      {/* Background spotlight */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] blur-xl rounded-full pointer-events-none group-hover:bg-white/[0.02] transition-colors" />

      <div>
        <div className="flex justify-between items-start gap-4">
          <div className="p-2.5 rounded-2xl squircle-icon-bg text-text-prim shrink-0">
            <FileText className="size-5" />
          </div>

          <div className="flex items-center gap-2">
            {!isFailed && !isPending && (
              <span className="font-mono text-[10px] font-bold text-text-prim px-2 py-0.5 bg-bg-elevated border border-border-strong rounded">
                ATS: {resume.ats_score ?? 'N/A'}
              </span>
            )}
            
            <button 
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 cursor-pointer transition-colors"
              title="Delete Resume"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-bold text-text-prim mt-4 truncate pr-2" title={resume.file_name}>
          {resume.file_name}
        </h3>
        <p className="text-[10px] text-text-muted mt-1 leading-none">
          Uploaded {formattedDate} {resume.file_size_bytes ? `· ${formatBytes(resume.file_size_bytes)}` : ''}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-4">
        <div>
          {isPending ? (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-bg-base text-text-sec border border-border-subtle rounded-full animate-pulse">Processing...</span>
          ) : isFailed ? (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-red-950/20 text-red-400 border border-red-500/10 rounded-full">Failed</span>
          ) : (
            <button
              onClick={onAnalyze}
              className="text-[10px] font-mono font-bold text-text-sec hover:text-text-prim flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="size-3 text-text-muted group-hover:animate-pulse" />
              AI Fixes
            </button>
          )}
        </div>

        {!isFailed && !isPending && (
          <span className="text-[10px] font-semibold text-text-sec flex items-center gap-1 group-hover:text-text-prim group-hover:translate-x-1 transition-all duration-200">
            Details
            <ArrowRight className="size-3" />
          </span>
        )}
      </div>
    </div>
  );
}