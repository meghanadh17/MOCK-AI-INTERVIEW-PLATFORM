import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi } from '@/api/quiz.api';
import { QuizCard } from '../components/QuizCard';
import { 
  Trophy, 
  Flame, 
  Clock, 
  Award, 
  Loader2, 
  Sparkles, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  Tag
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function QuizHomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [searchTopic, setSearchTopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  
  const defaultTab = searchParams.get('tab') === 'history' ? 'history' : 'quizzes';
  const [activeRightTab, setActiveRightTab] = useState<'quizzes' | 'history'>(defaultTab);

  const handleTabChange = (tab: 'quizzes' | 'history') => {
    setActiveRightTab(tab);
    if (tab === 'history') {
      setSearchParams({ tab: 'history' });
    } else {
      setSearchParams({});
    }
  };
  
  // Generator form state
  const [genTopic, setGenTopic] = useState('');
  const [genDifficulty, setGenDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [genCount, setGenCount] = useState<number>(10);

  // Queries
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['quiz-stats'],
    queryFn: quizApi.getQuizStats
  });

  const { data: rankInfo, isLoading: isRankLoading } = useQuery({
    queryKey: ['quiz-ranks'],
    queryFn: quizApi.getLeaderboardUser
  });

  const { data: quizzes = [], isLoading: isListLoading } = useQuery({
    queryKey: ['quizzes', searchTopic, selectedDifficulty],
    queryFn: () => quizApi.listQuizzes({
      topic: searchTopic || undefined,
      difficulty: selectedDifficulty === 'all' ? undefined : selectedDifficulty
    })
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['quiz-topics'],
    queryFn: quizApi.getQuizTopics
  });

  const { data: attempts = [], isLoading: isAttemptsLoading } = useQuery({
    queryKey: ['quiz-attempts'],
    queryFn: quizApi.getMyAttempts
  });

  // Mutation to generate AI Quiz
  const generateQuizMutation = useMutation({
    mutationFn: quizApi.generateQuiz,
    onSuccess: (newQuiz) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('AI Adaptive Quiz generated successfully!');
      // Navigate straight to attempt page
      navigate(`/app/quiz/${newQuiz.id}/attempt`);
    },
    onError: (err) => {
      console.error(err);
      toast.error('Failed to generate AI Quiz. Please try again.');
    }
  });

  const handleCreateAIQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTopic.trim()) {
      toast.error('Please enter a quiz topic.');
      return;
    }
    generateQuizMutation.mutate({
      topic: genTopic,
      difficulty: genDifficulty,
      count: genCount
    });
  };

  const formatDuration = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-8 text-left pb-12 select-none animate-fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-text-prim flex items-center gap-2.5 font-heading uppercase">
            AI Adaptive Quiz Arena
          </h1>
          <p className="text-[10px] text-text-muted mt-1.5 uppercase font-mono tracking-wider">
            Test runtime conceptual depth & challenge candidates
          </p>
        </div>

        <div>
          <button
            onClick={() => navigate('/app/quiz/leaderboard')}
            className="relative group flex items-center gap-2 px-4.5 py-2.5 text-xs font-semibold text-text-sec rounded-xl transition-all cursor-pointer font-heading active:scale-[0.98] neo-raised neo-raised-hover neo-raised-active"
          >
            <Trophy className="size-4 text-indigo-400" />
            <span>Arena Leaderboard</span>
            <ChevronRight className="size-3.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="relative group p-4.5 rounded-2xl flex items-center gap-3.5 transition-all neo-raised neo-raised-hover neo-raised-active">
          <div className="p-3 bg-zinc-950 border border-zinc-850 text-rose-450 rounded-xl shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5)]">
            <Flame className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Daily Streak</span>
            <span className="text-sm font-extrabold font-mono text-text-prim block mt-0.5">
              {isStatsLoading ? '...' : `${stats?.streak ?? 0} days`}
            </span>
          </div>
        </div>

        {/* Avg Score */}
        <div className="relative group p-4.5 rounded-2xl flex items-center gap-3.5 transition-all neo-raised neo-raised-hover neo-raised-active">
          <div className="p-3 bg-zinc-950 border border-zinc-850 text-emerald-455 rounded-xl shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5)]">
            <Award className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Avg Score</span>
            <span className="text-sm font-extrabold font-mono text-text-prim block mt-0.5">
              {isStatsLoading ? '...' : `${stats?.avg_score ?? 0}%`}
            </span>
          </div>
        </div>

        {/* Practice Time */}
        <div className="relative group p-4.5 rounded-2xl flex items-center gap-3.5 transition-all neo-raised neo-raised-hover neo-raised-active">
          <div className="p-3 bg-zinc-950 border border-zinc-850 text-indigo-400 rounded-xl shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5)]">
            <Clock className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Practice Time</span>
            <span className="text-sm font-extrabold font-mono text-text-prim block mt-0.5">
              {isStatsLoading ? '...' : formatDuration(stats?.total_time_s ?? 0)}
            </span>
          </div>
        </div>

        {/* Global Rank */}
        <div className="relative group p-4.5 rounded-2xl flex items-center gap-3.5 transition-all neo-raised neo-raised-hover neo-raised-active">
          <div className="p-3 bg-zinc-950 border border-zinc-850 text-zinc-400 rounded-xl shrink-0 shadow-[inset_1.5px_1.5px_3px_rgba(0,0,0,0.5)]">
            <Trophy className="size-4.5" />
          </div>
          <div>
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block">Global Rank</span>
            <span className="text-sm font-extrabold font-mono text-text-prim block mt-0.5">
              {isRankLoading ? '...' : rankInfo?.global_board?.rank ? `#${rankInfo.global_board.rank}` : 'Unranked'}
            </span>
          </div>
        </div>
      </div>

      {/* Split Layout Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        {/* Left Column: AI Quiz Generator Form & Popular Topics */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative p-6 rounded-2xl space-y-6 text-left neo-raised">
            <div>
              <h2 className="text-base font-heading font-extrabold text-text-prim flex items-center gap-2">
                <Sparkles className="size-5 text-indigo-400 animate-pulse" />
                AI Adaptive Quiz Generator
              </h2>
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
                Construct new adaptive quiz sessions
              </p>
            </div>

            <form onSubmit={handleCreateAIQuiz} className="space-y-5">
              {/* Technology Topic */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-sec">Technology Topic</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Docker, Redux, System Architectures..."
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-xs text-text-prim outline-none transition-all placeholder-zinc-650 focus:border-zinc-750 neo-sunken"
                    disabled={generateQuizMutation.isPending}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Difficulty Level */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-sec">Difficulty Level</label>
                  <Select
                    value={genDifficulty}
                    onValueChange={(val: any) => setGenDifficulty(val)}
                    disabled={generateQuizMutation.isPending}
                  >
                    <SelectTrigger className="!w-full !rounded-xl px-4 py-2.5 text-xs text-text-prim outline-none transition-all !h-10 neo-sunken !border-0 focus:!ring-0">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                      <SelectItem value="easy" className="cursor-pointer focus:bg-zinc-900">Easy</SelectItem>
                      <SelectItem value="medium" className="cursor-pointer focus:bg-zinc-900">Medium</SelectItem>
                      <SelectItem value="hard" className="cursor-pointer focus:bg-zinc-900">Hard</SelectItem>
                      <SelectItem value="expert" className="cursor-pointer focus:bg-zinc-900">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Questions count */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-sec">Questions Count</label>
                  <Select
                    value={String(genCount)}
                    onValueChange={(val) => setGenCount(Number(val))}
                    disabled={generateQuizMutation.isPending}
                  >
                    <SelectTrigger className="!w-full !rounded-xl px-4 py-2.5 text-xs text-text-prim outline-none transition-all !h-10 neo-sunken !border-0 focus:!ring-0">
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                      <SelectItem value="5" className="cursor-pointer focus:bg-zinc-900">5 Questions</SelectItem>
                      <SelectItem value="10" className="cursor-pointer focus:bg-zinc-900">10 Questions</SelectItem>
                      <SelectItem value="15" className="cursor-pointer focus:bg-zinc-900">15 Questions</SelectItem>
                      <SelectItem value="20" className="cursor-pointer focus:bg-zinc-900">20 Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={generateQuizMutation.isPending}
                className="w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-[0.99] disabled:opacity-50 shadow-[3px_3px_8px_rgba(0,0,0,0.5)]"
              >
                {generateQuizMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-zinc-600" />
                    <span>Constructing Quiz...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-zinc-950 fill-zinc-950/10" />
                    <span>Generate Adaptive Quiz →</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Popular Topics Card */}
          <div className="relative p-5 rounded-2xl space-y-4 text-left neo-raised">
            <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
              <Tag className="size-3.5 text-zinc-500" />
              Popular Topics
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {topics.map((t: any) => (
                <button
                  key={t.topic}
                  onClick={() => setSearchTopic(t.topic)}
                  className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-[10px] font-bold text-text-sec hover:text-text-prim transition-all rounded-full cursor-pointer shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]"
                >
                  {t.topic} <span className="text-indigo-400 font-mono">({t.quiz_count})</span>
                </button>
              ))}
              {topics.length === 0 && (
                <span className="text-[10px] text-text-muted italic">No topics found</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quizzes list & Filter toolbar */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tab Selector Toolbar */}
          <div className="relative flex p-1 rounded-2xl w-full sm:max-w-xs select-none neo-sunken">
            <button
              onClick={() => handleTabChange('quizzes')}
              className={cn(
                'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
                activeRightTab === 'quizzes'
                  ? 'text-white neo-raised neo-raised-hover neo-raised-active'
                  : 'text-text-muted hover:text-text-prim'
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Browse Quizzes</span>
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={cn(
                'relative flex-1 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 active:scale-[0.98]',
                activeRightTab === 'history'
                  ? 'text-white neo-raised neo-raised-hover neo-raised-active'
                  : 'text-text-muted hover:text-text-prim'
              )}
            >
              <Clock className="size-3.5" />
              <span>Recap History</span>
            </button>
          </div>

          {activeRightTab === 'quizzes' ? (
            <>
              {/* Filters toolbar */}
              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl p-4.5 neo-raised">
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <SlidersHorizontal className="size-3.5 text-indigo-400" />
                  Arena List
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:justify-end">
                  {/* Search */}
                  <div className="relative flex items-center w-full sm:w-52">
                    <Search className="absolute left-3.5 size-3.5 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search topic..."
                      value={searchTopic}
                      onChange={(e) => setSearchTopic(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs text-text-prim placeholder-zinc-650 outline-none transition-all rounded-xl focus:border-zinc-750 neo-sunken"
                    />
                  </div>
                  {/* Select difficulty */}
                  <div className="w-full sm:w-44">
                    <Select
                      value={selectedDifficulty}
                      onValueChange={(val) => setSelectedDifficulty(val)}
                    >
                      <SelectTrigger className="!w-full !rounded-xl px-3.5 !py-5 text-xs text-text-prim outline-none transition-all !h-[38px] neo-sunken !border-0 focus:!ring-0">
                        <SelectValue placeholder="All Difficulties" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                        <SelectItem value="all" className="cursor-pointer focus:bg-zinc-900">All Difficulties</SelectItem>
                        <SelectItem value="easy" className="cursor-pointer focus:bg-zinc-900">Easy</SelectItem>
                        <SelectItem value="medium" className="cursor-pointer focus:bg-zinc-900">Medium</SelectItem>
                        <SelectItem value="hard" className="cursor-pointer focus:bg-zinc-900">Hard</SelectItem>
                        <SelectItem value="expert" className="cursor-pointer focus:bg-zinc-900">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-text-muted font-mono">{quizzes.length} Practice Quizzes Available</span>
              </div>

              {isListLoading ? (
                <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl overflow-hidden neo-raised">
                  <Loader2 className="size-7 text-zinc-400 animate-spin" />
                  <p className="text-xs text-text-muted">Loading arena quizzes...</p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl text-center p-6 overflow-hidden neo-raised">
                  <p className="text-xs text-text-prim font-bold">No quizzes match your filters</p>
                  <p className="text-[10px] text-text-muted max-w-sm leading-relaxed">Type another topic in the filter toolbar above or construct a new custom set on the left!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {quizzes.map((quiz: any) => (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      onStart={() => navigate(`/app/quiz/${quiz.id}/attempt`)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-text-muted font-mono">{attempts.length} Past Attempts Logged</span>
              </div>

              {isAttemptsLoading ? (
                <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl overflow-hidden neo-raised">
                  <Loader2 className="size-7 text-zinc-400 animate-spin" />
                  <p className="text-xs text-text-muted">Loading recap history...</p>
                </div>
              ) : attempts.length === 0 ? (
                <div className="relative flex flex-col items-center justify-center py-24 gap-3 rounded-2xl text-center p-6 overflow-hidden neo-raised">
                  <p className="text-xs text-text-prim font-bold">No quiz recap history found</p>
                  <p className="text-[10px] text-text-muted max-w-sm leading-relaxed">Start practicing by generating a custom quiz or selecting an arena challenge topic!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((att: any) => {
                    const dateString = new Date(att.completed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const isExcellent = att.score >= 80;
                    const isPass = att.score >= 50;

                    return (
                      <div
                        key={att.attempt_id}
                        onClick={() => navigate(`/app/quiz/${att.quiz_id}/result/${att.attempt_id}`)}
                        className="relative p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer group overflow-hidden w-full neo-raised neo-raised-hover neo-raised-active"
                      >
                        <div className="min-w-0 flex-1 space-y-2 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              'px-2.5 py-0.5 font-mono text-[9px] uppercase font-bold rounded-md border shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]',
                              isExcellent
                                ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                                : isPass
                                ? 'bg-indigo-950/30 border-indigo-500/20 text-indigo-400'
                                : 'bg-rose-950/30 border-rose-500/20 text-rose-400'
                            )}>
                              {att.score.toFixed(0)}% Score
                            </span>
                            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                              Time taken: {formatDuration(att.time_taken_s)}
                            </span>
                          </div>
                          <h3 className="text-xs font-bold text-text-prim truncate group-hover:text-indigo-400 transition-colors">
                            {att.quiz_title}
                          </h3>
                          <span className="text-[9px] font-mono text-text-muted block">{dateString}</span>
                        </div>

                        <div className="p-1.5 rounded-full text-text-muted group-hover:text-zinc-300 transition-all neo-sunken">
                          <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}