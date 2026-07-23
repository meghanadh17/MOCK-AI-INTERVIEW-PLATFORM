import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Eye, UserCheck, Volume2, Smile } from 'lucide-react';
import { useVideoStore } from '@/store/video.store';

interface CoachTipChipProps {
  tip: string | null;
  onDismiss: () => void;
}

export function CoachTipChip({ tip, onDismiss }: CoachTipChipProps) {
  const coachTipCount = useVideoStore((state) => state.coachTipCount);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!tip) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, [tip, onDismiss]);

  const getTipDetails = (tipText: string) => {
    const lower = tipText.toLowerCase();
    let category: 'posture' | 'gaze' | 'speech' | 'emotion' | 'general' = 'general';
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (lower.includes('posture') || lower.includes('slouch') || lower.includes('shoulders') || lower.includes('sit up')) {
      category = 'posture';
    } else if (lower.includes('gaze') || lower.includes('camera') || lower.includes('eye contact') || lower.includes('look')) {
      category = 'gaze';
    } else if (lower.includes('speaking') || lower.includes('slow') || lower.includes('pace') || lower.includes('filler') || lower.includes('pause') || lower.includes('wpm')) {
      category = 'speech';
    } else if (lower.includes('stress') || lower.includes('relax') || lower.includes('breath') || lower.includes('composure') || lower.includes('smile')) {
      category = 'emotion';
    }

    // Set severity
    if (lower.includes('excellent') || lower.includes('good') || lower.includes('solid') || lower.includes('maintain') || lower.includes('focus')) {
      severity = 'info';
    } else if (lower.includes('slouched') || lower.includes('drifting') || lower.includes('stressed') || lower.includes('poor')) {
      severity = 'critical';
    } else {
      severity = 'warning';
    }

    return { category, severity };
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'posture':
        return UserCheck;
      case 'gaze':
        return Eye;
      case 'speech':
        return Volume2;
      case 'emotion':
        return Smile;
      default:
        return Lightbulb;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          borderClass: 'border-rose-500/30 bg-zinc-950/95 shadow-[0_0_20px_rgba(244,63,94,0.1)]',
          badgeClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          iconContainerClass: 'bg-rose-500/10 border border-rose-500/20',
          iconColor: 'text-rose-400',
          label: 'Critical Coaching Alert',
        };
      case 'warning':
        return {
          borderClass: 'border-amber-500/30 bg-zinc-950/95 shadow-[0_0_20px_rgba(245,158,11,0.1)]',
          badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          iconContainerClass: 'bg-amber-500/10 border border-amber-500/20',
          iconColor: 'text-amber-400',
          label: 'Coaching Hint',
        };
      default: // info
        return {
          borderClass: 'border-indigo-500/30 bg-zinc-950/95 shadow-[0_0_20px_rgba(99,102,241,0.1)]',
          badgeClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          iconContainerClass: 'bg-indigo-500/10 border border-indigo-500/20',
          iconColor: 'text-indigo-400',
          label: 'Performance Update',
        };
    }
  };

  let icon = Lightbulb;
  let styles = getSeverityStyles('info');

  if (tip) {
    const { category, severity } = getTipDetails(tip);
    icon = getCategoryIcon(category);
    styles = getSeverityStyles(severity);
  }

  const IconComponent = icon;

  return (
    <div className="absolute bottom-6 left-6 right-6 flex justify-center z-20 pointer-events-none">
      <AnimatePresence mode="wait">
        {tip && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 15, stiffness: 120 }}
            className={`w-full max-w-lg pointer-events-auto p-4 border rounded-xl flex items-center justify-between gap-3 backdrop-blur select-none text-left ${styles.borderClass}`}
          >
            <div className="flex gap-3 items-start">
              <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 shadow-inner ${styles.iconContainerClass}`}>
                <IconComponent className={`size-5 ${styles.iconColor} animate-[pulse_1.5s_infinite]`} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${styles.iconColor}`}>
                    {styles.label}
                  </span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded-full bg-zinc-900 border border-zinc-800 text-text-muted">
                    Tip #{coachTipCount}
                  </span>
                </div>
                <p className="text-xs text-text-prim leading-snug line-clamp-2">
                  {tip}
                </p>
              </div>
            </div>
            <button 
              onClick={onDismiss}
              className="text-text-muted hover:text-text-prim p-1.5 hover:bg-zinc-900 border border-transparent hover:border-border-subtle rounded-md transition-all shrink-0 cursor-pointer active:scale-90"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
