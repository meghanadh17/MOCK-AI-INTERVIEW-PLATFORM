import { MessageSquare, Video, ArrowRight, MoreVertical, Share2, Trash2 } from 'lucide-react';
import { ScoreBadge } from '@/components/custom/ScoreBadge';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    type: string; // "text" or "video"
    grade: number;
    created_at: string;
    status?: string;
  };
  onClick: () => void;
  onShare?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
}

export function SessionCard({ session, onClick, onShare, onDelete, isSelected }: SessionCardProps) {
  const isVideo = session.type === 'video';
  const Icon = isVideo ? Video : MessageSquare;

  const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) onShare(e);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(e);
  };

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-between p-3.5 cursor-pointer group select-none transition-all duration-300 rounded-2xl ${
        isSelected 
          ? 'bg-zinc-900/40 border border-zinc-750 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.03),4px_4px_12px_rgba(0,0,0,0.7)]' 
          : 'neo-raised neo-raised-hover neo-raised-active'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Left Icon */}
        <div className="p-2.5 bg-zinc-950 border border-zinc-900 text-zinc-400 shrink-0 group-hover:scale-105 group-hover:bg-zinc-900 group-hover:text-zinc-200 transition-all duration-300 rounded-xl shadow-[inset_1px_1px_3px_rgba(0,0,0,0.5)]">
          <Icon className="size-4.5" />
        </div>

        <div className="min-w-0">
          {/* Bold Role/Title */}
          <p className="text-sm font-extrabold text-zinc-100 group-hover:text-white transition-colors duration-200 truncate font-heading">
            {session.title || (isVideo ? 'Video Mock Session' : 'AI Technical Interview')}
          </p>

          {/* Type Chip + Date row */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border shadow-inner uppercase tracking-wider rounded-md ${
              isVideo
                ? 'bg-zinc-950 border-zinc-900 text-zinc-400'
                : 'bg-zinc-900 border-zinc-850/80 text-zinc-400'
            }`}>
              {isVideo ? 'Video' : 'AI Mock'}
            </span>
            <span className="text-[10px] text-zinc-600 select-none">·</span>
            <span className="text-[10px] text-zinc-500 font-mono">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Right side Score badge & Dropdown Menu */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="scale-100 group-hover:scale-105 transition-transform duration-300">
          <ScoreBadge score={session.grade} />
        </div>

        {/* Dropdown Popover Menu using Three Dots */}
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="p-1.5 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 hover:text-zinc-200 text-zinc-500 cursor-pointer transition-all rounded-lg shadow-[inset_1px_1px_2px_rgba(0,0,0,0.5)] active:scale-95 hover:scale-105"
                title="Actions"
              >
                <MoreVertical className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl bg-zinc-950 border border-zinc-900 shadow-2xl p-1.5 text-left z-50">
              <DropdownMenuItem 
                onClick={handleShareClick}
                className="rounded-lg cursor-pointer text-xs flex items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-900 focus:bg-zinc-900 transition-colors duration-150"
              >
                <Share2 className="size-3.5 text-zinc-400" />
                <span>Share Report</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDeleteClick}
                className="rounded-lg cursor-pointer text-xs flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/40 hover:text-red-300 focus:bg-red-950/40 focus:text-red-300 transition-colors duration-150"
              >
                <Trash2 className="size-3.5 text-red-500" />
                <span>Delete Record</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ArrowRight className="size-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all duration-300" />
      </div>
    </div>
  );
}