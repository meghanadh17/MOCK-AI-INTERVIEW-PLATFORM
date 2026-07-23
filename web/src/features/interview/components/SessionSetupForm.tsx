import React, { useState, useEffect } from 'react';
import { useResumeListQuery } from '@/features/resume/hooks/useResumeQueries';
import { DifficultySlider } from './DifficultySlider';
import { Sparkles, FileText, Briefcase } from 'lucide-react';
import { interviewApi } from '@/api/interview.api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SessionSetupFormProps {
  onSubmit: (data: {
    resume_id?: string | null;
    role?: string;
    difficulty?: number;
    type?: string;
    num_questions?: number;
    title?: string;
    job_description?: string;
  }) => void;
  isLoading: boolean;
}

import { useSearchParams } from 'react-router-dom';

export function SessionSetupForm({ onSubmit, isLoading }: SessionSetupFormProps) {
  const [searchParams] = useSearchParams();
  const presetRole = searchParams.get('role');

  // Form state
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [roleInput, setRoleInput] = useState<string>(presetRole || 'Software Engineer');
  const [difficulty, setDifficulty] = useState<number>(0.5); // Default to Medium (0.5)
  const [type, setType] = useState<string>('technical');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const title = '';
  const [jobDescription, setJobDescription] = useState<string>('');

  // Autocomplete roles list
  const [rolesList, setRolesList] = useState<Array<{ name: string; skills: string[] }>>([]);
  const [showRoleDropdown, setShowRoleDropdown] = useState<boolean>(false);
  const [filteredRoles, setFilteredRoles] = useState<Array<{ name: string; skills: string[] }>>([]);

  // Fetch user's resumes
  const { data: resumes = [] } = useResumeListQuery();

  // Fetch supported roles from backend
  useEffect(() => {
    interviewApi.getRoles()
      .then((res) => {
        if (res.data?.roles) {
          setRolesList(res.data.roles);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch roles list:', err);
        // Fallback roles
        setRolesList([
          { name: 'Software Engineer', skills: ['Python', 'FastAPI'] },
          { name: 'Frontend Developer', skills: ['React', 'TypeScript'] },
          { name: 'DevOps Engineer', skills: ['Docker', 'AWS'] },
          { name: 'Product Manager', skills: ['Roadmapping', 'Agile'] },
        ]);
      });
  }, []);

  // Filter roles based on input
  useEffect(() => {
    if (!roleInput) {
      setFilteredRoles(rolesList);
    } else {
      setFilteredRoles(
        rolesList.filter((r) =>
          r.name.toLowerCase().includes(roleInput.toLowerCase())
        )
      );
    }
  }, [roleInput, rolesList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      resume_id: selectedResumeId || null,
      role: roleInput,
      difficulty,
      type,
      num_questions: numQuestions,
      title: title || `${roleInput} Mock Interview`,
      job_description: jobDescription || undefined,
    });
  };

  const interviewTypes = [
    { value: 'technical', label: 'Technical' },
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'system_design', label: 'System Design' },
    { value: 'HR', label: 'HR Review' },
    { value: 'case', label: 'Case Study' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-2xl space-y-6 relative overflow-visible neo-raised">
      {/* 1. Target Role & Autocomplete */}
      <div className="space-y-2 relative">
        <label className="text-xs font-semibold text-text-sec flex items-center gap-1.5">
          <Briefcase className="size-3.5 text-zinc-400" />
          Target Job Role
        </label>
        <div className="relative">
          <input
            type="text"
            value={roleInput}
            onChange={(e) => {
              setRoleInput(e.target.value);
              setShowRoleDropdown(true);
            }}
            onFocus={() => setShowRoleDropdown(true)}
            placeholder="e.g. Senior Software Engineer"
            className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-text-prim outline-none transition-all neo-sunken"
            required
          />
          {showRoleDropdown && filteredRoles.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-bg-overlay border border-border-strong rounded-lg shadow-xl z-50 py-1">
              {filteredRoles.map((role) => (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => {
                    setRoleInput(role.name);
                    setShowRoleDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-text-prim bg-zinc-950 hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  {role.name}
                </button>
              ))}
            </div>
          )}
          {showRoleDropdown && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowRoleDropdown(false)} 
            />
          )}
        </div>
      </div>

      {/* 2. Resume Select (Optional) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-sec flex items-center gap-1.5">
          <FileText className="size-3.5 text-zinc-400" />
          Focus Resume Context (Optional)
        </label>
        <Select
          value={selectedResumeId || "none"}
          onValueChange={(val) => setSelectedResumeId(val === "none" ? "" : val)}
        >
          <SelectTrigger className="!w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-4 !py-2.5 text-xs text-text-prim outline-none transition-all !h-10 neo-sunken">
            <SelectValue placeholder="-- No Resume Context (General Questions) --" />
          </SelectTrigger>
          <SelectContent position="popper" className="bg-zinc-950 border border-zinc-900 text-text-prim">
            <SelectItem value="none">-- No Resume Context (General Questions) --</SelectItem>
            {resumes.map((res: any) => (
              <SelectItem key={res.id} value={res.id}>
                {res.filename || `Resume #${res.id.slice(0, 8)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-text-muted">
          Providing a resume dynamically tailors questions to your specific background and skills.
        </p>
      </div>

      {/* 3. Interview Type Chips */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-sec">Interview Mode</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {interviewTypes.map((mode) => {
            const isSel = type === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => setType(mode.value)}
                className={`px-2 py-2 text-xs font-bold border transition-all text-center cursor-pointer select-none rounded-xl ${
                  isSel
                    ? 'border-zinc-800 text-zinc-100 bg-zinc-950 shadow-inner neo-sunken'
                    : 'border-zinc-900 text-zinc-550 hover:text-zinc-350 bg-zinc-900/10 hover:bg-zinc-900/40'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Custom Difficulty Slider */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-sec">Difficulty Constraint</label>
        <div className="p-4 bg-zinc-950 border border-zinc-950/20 rounded-2xl neo-sunken">
          <DifficultySlider value={difficulty} onChange={setDifficulty} />
        </div>
      </div>

      {/* 5. Question Count Stepper */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-sec">Number of Questions</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setNumQuestions((prev) => Math.max(3, prev - 1))}
            className="size-9 rounded-xl flex items-center justify-center text-base font-bold cursor-pointer select-none transition-all text-text-prim neo-raised neo-raised-hover neo-raised-active"
          >
            -
          </button>
          <span className="font-mono text-sm font-bold text-text-prim w-12 text-center">{numQuestions}</span>
          <button
            type="button"
            onClick={() => setNumQuestions((prev) => Math.min(20, prev + 1))}
            className="size-9 rounded-xl flex items-center justify-center text-base font-bold cursor-pointer select-none transition-all text-text-prim neo-raised neo-raised-hover neo-raised-active"
          >
            +
          </button>
        </div>
      </div>

      {/* 6. Job Description context (Optional Textarea) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-sec flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-zinc-400" />
          Job Description Alignment (Optional)
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste targeted job listing or requirements context to calibrate the interviewer AI..."
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl p-3 text-xs text-text-prim outline-none resize-none leading-relaxed transition-all neo-sunken"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 select-none neo-raised neo-raised-hover neo-raised-active"
      >
        {isLoading ? (
          <>
            <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Constructing Session...</span>
          </>
        ) : (
          <span>Initialize Practice Session →</span>
        )}
      </button>
    </form>
  );
}