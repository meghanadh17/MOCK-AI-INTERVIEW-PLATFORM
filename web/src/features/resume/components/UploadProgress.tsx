import { X } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  statusText: string;
  onCancel?: () => void;
}

export function UploadProgress({ progress, statusText, onCancel }: UploadProgressProps) {
  return (
    <div className="w-full p-5 rounded-2xl space-y-4 text-left neo-raised">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h4 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">Processing Pipeline</h4>
          <p className="text-sm font-bold text-text-prim flex items-center gap-1">
            {statusText}
            <span className="flex gap-0.5 items-center justify-center shrink-0">
              <span className="size-1 rounded-full bg-text-prim animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1 rounded-full bg-text-prim animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1 rounded-full bg-text-prim animate-bounce" />
            </span>
          </p>
        </div>
        
        {onCancel && (
          <button 
            onClick={onCancel}
            className="p-1 rounded hover:bg-zinc-800 text-text-muted hover:text-text-prim cursor-pointer transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-2.5 w-full rounded-full overflow-hidden relative border border-zinc-950 neo-sunken">
          <div 
            className="h-full bg-gradient-to-r from-zinc-800 via-zinc-400 to-white transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono font-bold text-text-muted uppercase tracking-wide">
          <span>Upload & Parse</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}