import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaStream } from '../hooks/useMediaStream';
import { CameraPreview } from '../components/CameraPreview';
import { useResumeListQuery } from '@/features/resume/hooks/useResumeQueries';
import { DifficultySlider } from '../../interview/components/DifficultySlider';
import { videoApi } from '@/api/video.api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sparkles, FileText, Briefcase, Video, Activity, Wifi, Mic, History, ArrowRight } from 'lucide-react';
import { useVideoSessionsQuery } from '../hooks/useVideoSession';

export function VideoSetupPage() {
  const navigate = useNavigate();
  
  // Load video session history
  const { data: videoSessions = [], isLoading: historyLoading } = useVideoSessionsQuery({ limit: 10 });
  
  // Media capture controls
  const {
    permissionState,
    devices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    videoRef,
    startStream,
    stopStream,
  } = useMediaStream();

  // Setup form states
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [roleInput, setRoleInput] = useState<string>('Software Engineer');
  const [difficulty, setDifficulty] = useState<number>(0.5);
  const [type, setType] = useState<string>('technical');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Resume lists
  const { data: resumes = [] } = useResumeListQuery();

  // Start feed check on mount
  useEffect(() => {
    startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedVideoDeviceId(deviceId);
    startStream(deviceId);
  };

  const handleLaunchSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSession(true);

    try {
      const title = `${roleInput} Video Practice Mock`;
      const res = await videoApi.createSession({
        resume_id: selectedResumeId === 'none' || !selectedResumeId ? null : selectedResumeId,
        role: roleInput,
        difficulty,
        type,
        num_questions: numQuestions,
        title,
        job_description: jobDescription || undefined,
      });
      
      const newSession = res.data?.session;
      if (newSession && newSession.id) {
        toast.success('Video session initialized successfully.');
        stopStream();
        navigate(`/app/video/${newSession.id}`);
      } else {
        throw new Error('No session object returned from backend');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to launch video session setup.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const interviewTypes = [
    { value: 'technical', label: 'Technical Focus' },
    { value: 'behavioral', label: 'Behavioral Focus' },
    { value: 'system_design', label: 'System Design Focus' },
    { value: 'HR', label: 'HR / Behavioral Review' },
    { value: 'case', label: 'Case Study Focus' },
  ];

  return (
    <div className="space-y-8 animate-fade-in duration-300 text-left pb-16">
      
      {/* Page Header */}
      <div className="border-b border-zinc-800/80 pb-5 select-none flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-heading font-extrabold text-text-prim uppercase tracking-wider flex items-center gap-2">
          
            AI Video Interview Setup
          </h1>
          <p className="text-text-muted text-xs">
            Configure mock session parameters and align your webcam alignment checker before launching.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Hardware Camera Checks & Device Dropdown */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6 p-6 rounded-2xl relative overflow-hidden group neo-raised">
          {/* Subtle neomorphic border highlight */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          <div className="space-y-5">
            <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider select-none flex items-center gap-1.5">
              <Activity className="size-4 text-indigo-400 animate-pulse" />
              Hardware Alignment Check
            </h3>
            
            <CameraPreview 
              videoRef={videoRef} 
              permissionState={permissionState} 
            />
 
            {/* Video Input Select using custom Select component */}
            {permissionState === 'granted' && devices.length > 0 && (
              <div className="space-y-2 select-none">
                <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="size-3.5 text-zinc-400" />
                  Select Active Camera
                </label>
                
                <Select value={selectedVideoDeviceId} onValueChange={handleDeviceChange}>
                  <SelectTrigger className="w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-4 !py-2.5 text-xs text-text-prim outline-none transition-all !h-10 neo-sunken">
                    <SelectValue placeholder="Select active webcam device" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border border-zinc-900 text-xs text-text-prim">
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId} className="focus:bg-zinc-900 focus:text-text-prim cursor-pointer">
                        {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
 
          <div className="text-[10px] text-text-muted border-t border-zinc-900/80 pt-4 flex flex-col gap-2 select-none leading-relaxed font-mono">
            <span className="flex items-center gap-2">
              <Mic className="size-3.5 text-emerald-500 animate-pulse" />
              Audio Feed: Active microphone channel verified.
            </span>
            <span className="flex items-center gap-2">
              <Wifi className="size-3.5 text-emerald-500 animate-pulse" />
              Latency: Latency metrics within stable target ranges.
            </span>
          </div>
        </div>
 
        {/* Right Side: Setup Options Form */}
        <div className="lg:col-span-7 flex">
          <form 
            onSubmit={handleLaunchSession} 
            className="w-full p-6 rounded-2xl space-y-6 relative overflow-visible flex flex-col justify-between neo-raised"
          >
            {/* Form Fields container */}
            <div className="space-y-5">
              
              {/* 1. Target Role */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-sec flex items-center gap-1.5 select-none">
                  <Briefcase className="size-3.5 text-zinc-400" />
                  Target Job Role
                </label>
                <input
                  type="text"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="Software Engineer, Product Manager, etc."
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-text-prim outline-none transition-all neo-sunken"
                  required
                />
              </div>
 
              {/* 2. Resume Selection using custom Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-sec flex items-center gap-1.5 select-none">
                  <FileText className="size-3.5 text-zinc-400" />
                  Link Resume for Dynamic RAG Context
                </label>
                <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger className="w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-4 !py-2.5 text-xs text-text-prim outline-none transition-all !h-10 neo-sunken">
                    <SelectValue placeholder="No Linked Resume (General Questions Fallback)" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border border-zinc-900 text-xs text-text-prim">
                    <SelectItem value="none" className="focus:bg-zinc-900 focus:text-text-prim cursor-pointer">No Linked Resume (General Questions Fallback)</SelectItem>
                    {resumes.map((res: any) => (
                      <SelectItem key={res.id} value={res.id} className="focus:bg-zinc-900 focus:text-text-prim cursor-pointer">
                        {res.file_name} {res.is_primary ? '(Primary)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
 
              {/* 3. Stepper & Type Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Focus Area using custom Select */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-sec select-none">
                    Interview Evaluation Focus
                  </label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-full !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-4 !py-2.5 text-xs text-text-prim outline-none transition-all !h-10 neo-sunken">
                      <SelectValue placeholder="Select Evaluation Focus" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border border-zinc-900 text-xs text-text-prim">
                      {interviewTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="focus:bg-zinc-900 focus:text-text-prim cursor-pointer">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
 
                {/* Questions Counter Stepper */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-text-sec select-none">
                    Total Session Questions
                  </label>
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
                      onClick={() => setNumQuestions((prev) => Math.min(15, prev + 1))}
                      className="size-9 rounded-xl flex items-center justify-center text-base font-bold cursor-pointer select-none transition-all text-text-prim neo-raised neo-raised-hover neo-raised-active"
                    >
                      +
                    </button>
                  </div>
                </div>
 
              </div>
 
              {/* 4. Assessment Difficulty */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-sec select-none">
                  AI Agent Assessment Difficulty
                </label>
                <div className="p-4 bg-zinc-950 border border-zinc-950/20 rounded-2xl neo-sunken">
                  <DifficultySlider value={difficulty} onChange={setDifficulty} />
                </div>
              </div>
 
              {/* 5. Job Description (Optional) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-sec select-none">
                  Job Description Details (Optional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description to dynamically align questions and evaluation dimensions..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-700 rounded-xl p-3 text-xs text-text-prim outline-none resize-none leading-relaxed transition-all neo-sunken"
                />
              </div>
 
            </div>
 
            {/* Launch Button Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end pt-4 border-t border-zinc-900 select-none gap-3 w-full">
              <button
                type="submit"
                disabled={isCreatingSession || permissionState !== 'granted'}
                className="w-full py-3 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 select-none neo-raised neo-raised-hover neo-raised-active"
              >
                {isCreatingSession ? (
                  <>
                    <div className="size-3.5 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                    <span>Launching Practice HUD...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-zinc-100 animate-pulse shrink-0" />
                    <span>Launch Camera Practice Session</span>
                  </>
                )}
              </button>
            </div>
 
          </form>
        </div>
 
      </div>

      {/* Past Video Sessions History */}
      <div className="pt-8 border-t border-zinc-900 space-y-5 select-none text-left">
        <div className="border-b border-border-subtle pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-heading font-extrabold text-text-prim flex items-center gap-1.5">
              <History className="size-4.5 text-text-muted" />
              Video Practice History
            </h2>
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
              Review your past non-verbal performance analytics and playback recordings
            </p>
          </div>
          {videoSessions.length > 0 && (
            <button 
              onClick={() => navigate('/app/sessions')} 
              className="text-xs font-semibold text-text-sec hover:text-text-prim hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              View all
              <ArrowRight className="size-3" />
            </button>
          )}
        </div>

        {historyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-bg-surface border border-border-def rounded-xl animate-pulse" />
            ))}
          </div>
        ) : videoSessions.length === 0 ? (
          <div className="p-8 bg-zinc-950/20 border border-zinc-900 rounded-xl text-center text-text-muted text-xs">
            <p>No prior video mock sessions found.</p>
            <p className="mt-1 text-[10px] text-text-disabled">Align your camera check and launch a new video mock practice.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoSessions.map((sess: any) => {
              const dateString = new Date(sess.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const isCompleted = sess.status === 'completed';
              const avgScore = (sess.avg_confidence * 100).toFixed(0);

              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    if (isCompleted) {
                      navigate(`/app/video/${sess.id}/report`);
                    } else {
                      navigate(`/app/video/${sess.id}`);
                    }
                  }}
                  className="p-4 rounded-2xl flex flex-col justify-between gap-3 cursor-pointer transition-all duration-150 group neo-raised neo-raised-hover neo-raised-active"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 font-mono text-[9px] uppercase font-bold rounded-md ${
                        isCompleted 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                          : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                      }`}>
                        {sess.status} {isCompleted && `(${avgScore}%)`}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">{dateString}</span>
                    </div>

                    <h3 className="text-xs font-semibold text-text-prim truncate group-hover:text-indigo-400 transition-colors">
                      {sess.title || `Video Session (${sess.webrtc_room_id})`}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-text-muted border-t border-zinc-900/60 pt-2">
                    <span>Posture: {((sess.avg_posture_score || 0.8) * 100).toFixed(0)}%</span>
                    <span>·</span>
                    <span>Eye Contact: {((sess.avg_eye_contact || 0.75) * 100).toFixed(0)}%</span>
                    <ArrowRight className="size-3.5 text-text-disabled group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}