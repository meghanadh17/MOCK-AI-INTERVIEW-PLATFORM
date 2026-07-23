import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInterviewSetupMutation } from '../hooks/useInterviewQueries';
import { useSessionHistoryQuery } from '@/features/sessions/hooks/useSessionQueries';
import { SessionSetupForm } from '../components/SessionSetupForm';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  History, 
  Trash2, 
  Calendar, 
  ArrowRight
} from 'lucide-react';
import { interviewApi } from '@/api/interview.api';

export function InterviewSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Load past sessions (unified text + video history)
  const { data: sessions = [], isLoading: historyLoading } = useSessionHistoryQuery(10);
  const setupMutation = useInterviewSetupMutation();
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleStartSession = (formData: any) => {
    setupMutation.mutate(formData, {
      onSuccess: (data) => {
        toast.success('Interview session created successfully!');
        // Navigate to the interactive session page
        navigate(`/app/interview/${data.id}`);
      },
      onError: (err: any) => {
        console.error('Setup mutation failed:', err);
        toast.error('Failed to configure interview. Please try again.');
      }
    });
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(id);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    const id = sessionToDelete;
    setSessionToDelete(null);

    try {
      await interviewApi.deleteSession(id);
      toast.success('Session deleted.');
      queryClient.invalidateQueries({ queryKey: ['interview', 'sessions'] });
    } catch (err) {
      toast.error('Failed to delete session.');
    }
  };

  const getStatusBadge = (status: string, score?: number) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase font-bold rounded-md">
            Done ({score || 0})
          </span>
        );
      case 'active':
        return (
          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[9px] uppercase font-bold rounded-md animate-pulse">
            Active
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 text-zinc-400 font-mono text-[9px] uppercase font-bold rounded-md">
            Setup
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-extrabold text-text-prim flex items-center gap-2">
          AI Interview Coaching Module
        </h1>
        <p className="text-text-sec text-xs mt-1">
          Simulate professional coding/behavioral interviews with real-time text evaluations, speech-to-text integration, and detailed scorecards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Setup Config Card (Left Column) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border-b border-border-subtle pb-3">
            <h2 className="text-base font-heading font-extrabold text-text-prim">
              Configure New Practice Session
            </h2>
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
              Custom-tailored generative questions
            </p>
          </div>

          <SessionSetupForm 
            onSubmit={handleStartSession} 
            isLoading={setupMutation.isPending} 
          />
        </div>

        {/* History Panel (Right Column) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border-b border-border-subtle pb-3 flex items-center justify-between">
            <h2 className="text-base font-heading font-extrabold text-text-prim flex items-center gap-1.5">
              <History className="size-4.5 text-text-muted" />
              Practice History
            </h2>
            {sessions.length > 0 && (
              <button 
                onClick={() => navigate('/app/sessions')} 
                className="text-xs font-bold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                View all
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-bg-surface border border-border-def rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 bg-bg-surface border border-border-def rounded-xl text-center text-text-muted text-xs">
              <p>No prior practice sessions found.</p>
              <p className="mt-1 text-[10px] text-text-disabled">Start your first mock session using the configuration builder.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 no-scrollbar">
              {sessions.map((sess: any) => {
                const dateString = new Date(sess.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const isCompleted = sess.status === 'completed';
                const isVideo = sess.type === 'video';

                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      if (isCompleted) {
                        if (isVideo) {
                          navigate(`/app/video/${sess.id}/report`);
                        } else {
                          navigate(`/app/interview/${sess.id}/report`);
                        }
                      } else {
                        if (isVideo) {
                          navigate(`/app/video/${sess.id}`);
                        } else {
                          navigate(`/app/interview/${sess.id}`);
                        }
                      }
                    }}
                    className="p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group neo-raised neo-raised-hover"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(sess.status, sess.total_score || sess.grade)}
                        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                          {isVideo ? 'video mode' : (sess.type || 'technical')}
                        </span>
                      </div>
                      
                      <h3 className="text-xs font-semibold text-text-prim truncate group-hover:text-indigo-400 transition-colors">
                        {sess.title || (isVideo ? 'AI Video Practice Mock' : `${sess.role || 'Software Engineer'} Practice`)}
                      </h3>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3 text-text-disabled" />
                          {dateString}
                        </span>
                        {!isVideo && (
                          <>
                            <span>•</span>
                            <span>{sess.questions?.length || sess.num_questions || 5} Questions</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isVideo && (
                        <button
                          onClick={(e) => handleDeleteSession(sess.id, e)}
                          className="p-1.5 rounded-lg border border-zinc-900 bg-zinc-950 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-text-muted transition-all cursor-pointer opacity-0 group-hover:opacity-100 animate-fade-in"
                          title="Delete Session"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                      <div className="p-1.5 rounded-full bg-zinc-950 border border-zinc-900 text-text-muted group-hover:text-zinc-300 group-hover:border-zinc-700 transition-all">
                        <ArrowRight className="size-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border border-zinc-900 text-text-prim shadow-[8px_8px_24px_rgba(0,0,0,0.6)] rounded-2xl neo-raised">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold font-heading uppercase text-left">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-text-muted text-left">
              Are you sure you want to delete this session record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-text-sec hover:text-text-prim rounded-xl transition-all cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSession}
              className="bg-rose-600 hover:bg-rose-700 text-white border-0 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}