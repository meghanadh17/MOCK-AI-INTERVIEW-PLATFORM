import { Check, AlertCircle, Loader2 } from 'lucide-react';

export type StepStatus = 'pending' | 'processing' | 'success' | 'failed';

interface ParseStatusStepperProps {
  uploadStatus: StepStatus;
  parseStatus: StepStatus;
  indexStatus: StepStatus;
}

export function ParseStatusStepper({ uploadStatus, parseStatus, indexStatus }: ParseStatusStepperProps) {
  const steps = [
    { label: 'Upload File', status: uploadStatus },
    { label: 'AI Text Parsing', status: parseStatus },
    { label: 'Vector Indexing', status: indexStatus }
  ];

  return (
    <div className="w-full p-6 rounded-2xl text-left neo-raised">
      <h4 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider mb-6">Pipeline Status</h4>
      
      <div className="flex items-center justify-between w-full relative">
        {/* Horizontal Connector Line */}
        <div className="absolute top-4.5 left-4 right-4 h-0.5 bg-zinc-850 -z-10" />

        {steps.map((step, idx) => {
          const isPending = step.status === 'pending';
          const isProcessing = step.status === 'processing';
          const isSuccess = step.status === 'success';
          const isFailed = step.status === 'failed';

          return (
            <div key={idx} className="flex flex-col items-center flex-1 text-center relative group">
              {/* Stepper Circle */}
              <div 
                className={`size-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isSuccess 
                    ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-md shadow-white/5' 
                    : isFailed
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    : isProcessing
                    ? 'border-white bg-zinc-900 animate-pulse text-zinc-100 ring-4 ring-white/10'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                {isSuccess && <Check className="size-4.5 stroke-[3]" />}
                {isFailed && <AlertCircle className="size-4.5" />}
                {isProcessing && <Loader2 className="size-4.5 animate-spin" />}
                {isPending && <span className="text-xs font-mono font-bold">{idx + 1}</span>}
              </div>

              {/* Label */}
              <span className={`text-[10px] font-heading font-bold uppercase tracking-wider mt-3 transition-colors ${
                isSuccess || isProcessing ? 'text-text-prim' : 'text-text-muted'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}