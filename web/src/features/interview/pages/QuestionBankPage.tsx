import { useState } from 'react';
import { 
  useQuestionBankQuery, 
  useGenerateQuestionBankMutation, 
  useRateQuestionMutation 
} from '../hooks/useInterviewQueries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Sparkles, 
  Star, 
  HelpCircle, 
  X,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';

export function QuestionBankPage() {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | undefined>(undefined);

  // Modal / Generator Dialog State
  const [showGenerator, setShowGenerator] = useState(false);
  const [genRole, setGenRole] = useState('Software Engineer');
  const [genType, setGenType] = useState('technical');
  const [genDifficulty, setGenDifficulty] = useState('medium');
  const [genCount, setGenCount] = useState(5);

  // Queries & Mutations
  const { data: questions = [], isLoading, refetch } = useQuestionBankQuery({
    role: searchQuery || undefined,
    type: selectedType || undefined,
    difficulty: selectedDifficulty
  });

  const generateMutation = useGenerateQuestionBankMutation();
  const rateMutation = useRateQuestionMutation();

  const handleGenerateQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate({
      role: genRole,
      type: genType,
      difficulty: genDifficulty,
      count: genCount
    }, {
      onSuccess: () => {
        toast.success('Successfully generated new AI questions in the bank!');
        setShowGenerator(false);
        refetch();
      },
      onError: () => {
        toast.error('Failed to generate AI questions.');
      }
    });
  };

  const handleRateQuestion = (qId: string, rating: number) => {
    rateMutation.mutate({ qId, rating }, {
      onSuccess: () => {
        toast.success('Rating submitted.');
      },
      onError: () => {
        toast.error('Failed to submit rating.');
      }
    });
  };

  // Difficulty mapping helpers
  const getDifficultyLabel = (diff: number) => {
    if (diff <= 0.35) return 'Easy';
    if (diff <= 0.7) return 'Medium';
    return 'Hard';
  };

  const getDifficultyColor = (diff: number) => {
    if (diff <= 0.35) return 'bg-zinc-900 text-zinc-300 border-zinc-800';
    if (diff <= 0.7) return 'bg-zinc-950/60 text-zinc-400 border-zinc-850';
    return 'bg-zinc-950/20 text-zinc-550 border-dashed border-zinc-700';
  };

  // Filter local results if backend doesn't support full text search on query input
  const filteredQuestions = questions.filter((q: any) => {
    const matchesSearch = !searchQuery || 
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.role && q.role.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = !selectedType || q.question_type === selectedType;
    
    const matchesDiff = selectedDifficulty === undefined || 
      (selectedDifficulty === 0.25 && q.difficulty <= 0.35) ||
      (selectedDifficulty === 0.5 && q.difficulty > 0.35 && q.difficulty <= 0.7) ||
      (selectedDifficulty === 0.8 && q.difficulty > 0.7);

    return matchesSearch && matchesType && matchesDiff;
  });

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-20 relative">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-text-prim flex items-center gap-2">
            <HelpCircle className="size-6 text-indigo-500" />
            AI Question Bank
          </h1>
          <p className="text-text-sec text-xs mt-1">
            Browse, rate, and batch-generate AI-calibrated questions for various technical and behavioral mock scopes.
          </p>
        </div>

        {/* Generate Trigger Button */}
        <button
          onClick={() => setShowGenerator(true)}
          className="px-4 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none neo-raised neo-raised-hover neo-raised-active"
        >
          <Sparkles className="size-3.5" />
          Generate AI Quiz Set
        </button>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center neo-raised">
        
        <div className="md:col-span-6 relative">
          <input
            type="text"
            placeholder="Search questions by role or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-text-prim outline-none transition-all neo-sunken"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
        </div>

        <div className="md:col-span-3">
          <Select
            value={selectedType || "all"}
            onValueChange={(val) => setSelectedType(val === "all" ? "" : val)}
          >
            <SelectTrigger className="!w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-3 !py-2 text-xs text-text-prim outline-none transition-all !h-9 neo-sunken">
              <SelectValue placeholder="All Formats" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-zinc-950 border border-zinc-900 text-text-prim">
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="behavioral">Behavioral</SelectItem>
              <SelectItem value="system_design">System Design</SelectItem>
              <SelectItem value="HR">HR Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <Select
            value={selectedDifficulty === undefined ? "all" : String(selectedDifficulty)}
            onValueChange={(val) => setSelectedDifficulty(val === "all" ? undefined : Number(val))}
          >
            <SelectTrigger className="!w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-3 !py-2 text-xs text-text-prim outline-none transition-all !h-9 neo-sunken">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-zinc-950 border border-zinc-900 text-text-prim">
              <SelectItem value="all">All Difficulties</SelectItem>
              <SelectItem value="0.25">Easy</SelectItem>
              <SelectItem value="0.5">Medium</SelectItem>
              <SelectItem value="0.8">Hard / Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Main List Area */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="size-8 text-indigo-500 animate-spin" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="p-12 rounded-2xl text-center text-text-muted text-xs neo-raised">
          <p>No matches found in the community Q-bank.</p>
          <button
            onClick={() => setShowGenerator(true)}
            className="mt-4 px-4 py-2 text-text-prim font-bold text-xs rounded-xl cursor-pointer transition-all neo-raised neo-raised-hover neo-raised-active"
          >
            Generate Custom Questions
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((q: any) => {
            const avgRating = q.rating_avg || 0;
            const difficultyLabel = getDifficultyLabel(q.difficulty || 0.5);
            const difficultyClass = getDifficultyColor(q.difficulty || 0.5);

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all group relative overflow-hidden text-left neo-raised neo-raised-hover"
              >
                {/* Header Tag rows */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-350 font-mono text-[9px] uppercase font-bold rounded-md">
                      {q.question_type || 'technical'}
                    </span>
                    <span className={`px-2 py-0.5 border font-mono text-[9px] uppercase font-bold rounded ${difficultyClass}`}>
                      {difficultyLabel}
                    </span>
                  </div>

                  {/* Stars rating Display */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = star <= Math.round(avgRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRateQuestion(q.id, star)}
                          className="text-text-muted hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <Star className={`size-3.5 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-text-disabled'}`} />
                        </button>
                      );
                    })}
                    {avgRating > 0 && (
                      <span className="text-[10px] font-mono text-text-muted font-bold ml-1">
                        {avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-text-prim leading-relaxed">
                    "{q.question_text}"
                  </p>
                  {q.role && (
                    <p className="text-[10px] font-mono text-text-muted">
                      Target Context: <span className="text-text-sec">{q.role}</span>
                    </p>
                  )}
                </div>

                {/* Keywords listing if present */}
                {q.expected_keywords && q.expected_keywords.length > 0 && (
                  <div className="pt-2.5 border-t border-zinc-900 flex flex-wrap gap-1">
                    {q.expected_keywords.map((kw: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-900 text-[8.5px] text-text-muted rounded font-mono">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showGenerator && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in duration-200">
          <div className="w-full max-w-md p-6 relative z-10 space-y-6 text-left rounded-2xl neo-raised">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-heading font-extrabold text-text-prim flex items-center gap-1.5">
                <Sparkles className="size-4 text-zinc-300" />
                AI Batch Quiz Generator
              </h3>
              <button
                onClick={() => setShowGenerator(false)}
                className="p-1 rounded-md hover:bg-zinc-800 text-text-muted hover:text-text-prim transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGenerateQuestions} className="space-y-4">
              
              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-sec">Target Scope Role</label>
                <input
                  type="text"
                  value={genRole}
                  onChange={(e) => setGenRole(e.target.value)}
                  placeholder="e.g. Django Specialist"
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl px-3 py-2 text-xs text-text-prim outline-none transition-all neo-sunken"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-sec">Interview Format</label>
                <Select
                  value={genType}
                  onValueChange={setGenType}
                >
                  <SelectTrigger className="!w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-3 !py-2.5 text-xs text-text-prim outline-none !h-9 neo-sunken">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="system_design">System Design</SelectItem>
                    <SelectItem value="HR">HR Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-sec">Difficulty Target</label>
                <Select
                  value={genDifficulty}
                  onValueChange={setGenDifficulty}
                >
                  <SelectTrigger className="!w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-3 !py-2.5 text-xs text-text-prim outline-none !h-9 neo-sunken">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border border-zinc-900 text-text-prim">
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard / Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Count Stepper */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-sec">Batch Question Count</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGenCount((prev) => Math.max(1, prev - 1))}
                    className="size-8 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer transition-all neo-raised neo-raised-hover neo-raised-active text-text-prim"
                  >
                    -
                  </button>
                  <span className="font-mono text-sm font-bold text-text-prim w-8 text-center">{genCount}</span>
                  <button
                    type="button"
                    onClick={() => setGenCount((prev) => Math.min(10, prev + 1))}
                    className="size-8 rounded-xl flex items-center justify-center text-sm font-bold cursor-pointer transition-all neo-raised neo-raised-hover neo-raised-active text-text-prim"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setShowGenerator(false)}
                  className="px-4 py-2 text-text-muted hover:text-text-prim text-xs font-bold rounded-xl cursor-pointer transition-all neo-raised neo-raised-hover neo-raised-active"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={generateMutation.isPending}
                  className="px-5 py-2 text-text-prim text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none transition-all neo-raised neo-raised-hover neo-raised-active"
                >
                  {generateMutation.isPending ? (
                    <>
                      <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      <span>Generate Batch</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}