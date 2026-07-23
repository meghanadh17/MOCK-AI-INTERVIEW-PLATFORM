import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMediaStream } from '../hooks/useMediaStream';
import { useVideoWebSocket } from '../hooks/useVideoWebSocket';
import { CameraPreview } from '../components/CameraPreview';
import { MetricsSidebar } from '../components/MetricsSidebar';
import { CoachTipChip } from '../components/CoachTipChip';
import { InterviewerAvatar } from '../components/InterviewerAvatar';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useVideoStore } from '@/store/video.store';
import { videoApi } from '@/api/video.api';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mic, 
  MicOff, 
  StopCircle, 
  CheckCircle, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  Sparkles,
  Video
} from 'lucide-react';

export function VideoInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Zustand Store
  const coachingTip = useVideoStore((state) => state.coachingTip);
  const setCoachingTip = useVideoStore((state) => state.setCoachingTip);
  const setSessionId = useVideoStore((state) => state.setSessionId);
  const resetStore = useVideoStore((state) => state.resetStore);
  const setSessionStartTime = useVideoStore((state) => state.setSessionStartTime);

  // Local state
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  
  // Custom speech input state
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showTextSubmit, setShowTextSubmit] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Recording State & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [isReaderMuted, setIsReaderMuted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Hook 1: Media stream (Webcam + Audio) with devices info
  const {
    stream,
    permissionState,
    devices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    videoRef,
    startStream,
    stopStream,
  } = useMediaStream();

  // Hook 2: WebSockets frame/coach/question channels
  const {
    activeQuestion,
    evaluationFeedback,
    isEvaluatingAnswer,
    questionIndex,
    totalQuestions,
    sendAnswer,
    requestNextQuestion,
  } = useVideoWebSocket(id, videoRef);

  // TTS Hook
  const { speak, stop, isSpeaking } = useTextToSpeech();

  // Trigger TTS readout when activeQuestion changes
  useEffect(() => {
    if (activeQuestion && !isReaderMuted) {
      const timer = setTimeout(() => {
        speak(activeQuestion);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeQuestion, speak, isReaderMuted]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Track question start time and reset transcript on question change
  useEffect(() => {
    if (activeQuestion) {
      setTranscript('');
      setTypedAnswer('');
      setQuestionStartTime(Date.now());
    }
  }, [activeQuestion]);

  // Compute real-time speaking pace (WPM)
  useEffect(() => {
    if (!transcript || !questionStartTime) return;
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    const elapsedMinutes = (Date.now() - questionStartTime) / 1000 / 60;
    
    if (elapsedMinutes > 0.05 && words.length > 0) {
      const wpm = Math.round(words.length / elapsedMinutes);
      useVideoStore.getState().updateSpeakingPace(wpm);
    }
  }, [transcript, questionStartTime]);

  // Keyboard Listener: Press Enter/ArrowRight to proceed on evaluated answer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }
      
      if (evaluationFeedback) {
        if (e.key === 'ArrowRight' || e.key === 'Enter') {
          e.preventDefault();
          setTranscript('');
          requestNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [evaluationFeedback, requestNextQuestion]);

  // Handle switching video inputs live
  const handleDeviceChange = (deviceId: string) => {
    setSelectedVideoDeviceId(deviceId);
    startStream(deviceId);
  };

  // SpeechRecognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          }
        }
        if (final) {
          setTranscript((prev) => prev + final);
        }
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Listen logic based on states
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    const shouldListen = activeQuestion && !isMicMuted && !evaluationFeedback && !isEvaluatingAnswer && !showTextSubmit;
    
    if (shouldListen) {
      if (!isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.warn('Failed to start speech recognition:', e);
        }
      }
    } else {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [activeQuestion, isMicMuted, evaluationFeedback, isEvaluatingAnswer, showTextSubmit, isListening]);

  // MediaRecorder setup
  useEffect(() => {
    if (stream && permissionState === 'granted') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) { /* ignore */ }
      }

      try {
        let options = { mimeType: 'video/webm;codecs=vp9,opus' };
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
          try {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
          } catch (e2) {
            mediaRecorder = new MediaRecorder(stream);
          }
        }
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recordedChunksRef.current = [];
        mediaRecorder.start(1000); 
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        console.log('MediaRecorder started, chunks cleared.');
      } catch (err) {
        console.error('Failed to start MediaRecorder:', err);
      }
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) { /* ignore */ }
      }
      setIsRecording(false);
    };
  }, [stream, permissionState]);

  // Initialize streams and session details
  useEffect(() => {
    if (!id) return;
    setSessionId(id);

    const init = async () => {
      setIsStarting(true);
      recordedChunksRef.current = [];
      try {
        const detailRes = await videoApi.getSessionDetail(id);
        setSessionDetail(detailRes.data);

        await startStream();
        await videoApi.startSession(id);
        setSessionStartTime(Date.now());
      } catch (err) {
        console.error('Failed to initialize session feed:', err);
        toast.error('Device configuration or session start failed.');
      } finally {
        setIsStarting(false);
      }
    };
    init();

    return () => {
      stopStream();
      resetStore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle ending the video interview practice session
  const handleEndSession = async () => {
    if (!id) return;
    setIsEnding(true);
    stop(); 
    
    const stopRecordingPromise = new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          console.log('MediaRecorder onstop fired, chunks flushed');
          resolve();
        };
        try {
          recorder.stop();
        } catch (e) {
          console.error('Failed to stop MediaRecorder:', e);
          resolve();
        }
      } else {
        resolve();
      }
    });

    await stopRecordingPromise;

    try {
      await videoApi.endSession(id);
      
      if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const formData = new FormData();
        formData.append('file', blob, `${id}.webm`);
        try {
          await videoApi.uploadRecording(id, formData);
          toast.success('Interview recording saved successfully.');
        } catch (uploadErr) {
          console.error('Failed to upload video recording:', uploadErr);
          toast.warning('Analytics completed, but video recording failed to save.');
        }
      } else {
        console.warn('No recorded chunks available for upload!');
      }
      
      stopStream();
      toast.success('Video practice session ended. Generating reports...');
      navigate(`/app/video/${id}/report`);
    } catch (err) {
      console.error(err);
      toast.error('Could not terminate practice session.');
    } finally {
      setIsEnding(false);
    }
  };

  const handleSpeechSubmit = () => {
    const answer = showTextSubmit ? typedAnswer.trim() : transcript.trim();
    if (!answer) {
      toast.error('Please speak or type a response before submitting.');
      return;
    }
    stop(); 
    sendAnswer(answer);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in duration-300 text-left pb-16 relative min-h-[600px]">
      
      {/* Header with Switch Camera & Mute Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-900 pb-4 gap-4 select-none">
        <div className="space-y-1 w-full md:w-auto">
          <h2 className="text-sm font-heading font-extrabold text-text-prim uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-400 shrink-0 animate-pulse" />
            {sessionDetail?.title || 'AI Interactive Video Session'}
          </h2>
          <p className="text-[10px] text-text-muted font-mono truncate">
            Session ID: {id}
          </p>
        </div>
        
        {/* Buttons & Camera Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto justify-end">
          {/* Live Camera Device Switcher */}
          {permissionState === 'granted' && devices.length > 0 && (
            <div className="w-full sm:w-auto">
              <Select value={selectedVideoDeviceId} onValueChange={handleDeviceChange}>
                <SelectTrigger className="w-full sm:w-48 !bg-zinc-950 !border-zinc-900 focus:!border-zinc-700 !rounded-xl px-4 !py-2 text-xs text-text-prim outline-none transition-all !h-9 neo-sunken select-none text-left">
                  <div className="flex items-center gap-1.5 truncate">
                    <Video className="size-3.5 text-zinc-400 shrink-0" />
                    <SelectValue placeholder="Switch Webcam" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border border-zinc-800 text-xs text-text-prim">
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId} className="focus:bg-zinc-900 focus:text-text-prim cursor-pointer">
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action buttons wrapper */}
          <div className="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
            {/* Mute Microphone */}
            <button
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-2.5 border rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 select-none ${
                isMicMuted 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                  : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:bg-zinc-800'
              }`}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMicMuted ? <MicOff className="size-4 shrink-0" /> : <Mic className="size-4 shrink-0" />}
            </button>
            
            {/* Finish Session */}
            <button 
              onClick={handleEndSession}
              disabled={isEnding || isStarting}
              className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 select-none shadow-md shrink-0 flex-1 sm:flex-none"
            >
              <StopCircle className="size-3.5" />
              <span>End Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Panel Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side Column (Col-Span 8): Camera Preview & Q&A Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6 justify-between w-full">
          
          {/* Camera Frame */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-zinc-850 bg-black">
            <CameraPreview 
              videoRef={videoRef} 
              permissionState={permissionState} 
              isRecording={isRecording}
            />

            {/* Coach Tip Chip Overlay */}
            <CoachTipChip 
              tip={coachingTip} 
              onDismiss={() => setCoachingTip(null)} 
            />
          </div>

          {/* Q&A Interactions Panel */}
          {activeQuestion && (
            <div className="p-4 sm:p-6 rounded-2xl space-y-6 relative overflow-hidden text-left w-full neo-raised">
              {/* Top Neomorphic highlight */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 border border-zinc-900 rounded-2xl w-full neo-sunken">
                {/* AI Avatar */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <InterviewerAvatar isSpeaking={isSpeaking} compact />
                </div>
                
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto border-t border-zinc-900/40 sm:border-0 pt-2.5 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isSpeaking) stop();
                        else speak(activeQuestion);
                      }}
                      className="p-1.5 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-text-muted hover:text-text-prim transition-colors"
                      title={isSpeaking ? "Pause query speech" : "Listen query audio"}
                    >
                      {isSpeaking ? <VolumeX className="size-3.5 text-rose-400" /> : <Volume2 className="size-3.5 text-indigo-400" />}
                    </button>
                    
                    <button
                      onClick={() => setIsReaderMuted(!isReaderMuted)}
                      className={`px-1.5 py-1 rounded-lg border text-[8px] font-mono font-bold transition-colors ${
                        isReaderMuted 
                          ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' 
                          : 'text-zinc-500 border-zinc-850 bg-zinc-900/40 hover:text-zinc-350'
                      }`}
                      title="Auto-Read Questions toggle"
                    >
                      {isReaderMuted ? "MUTED" : "AUTO-READ"}
                    </button>

                    {totalQuestions > 0 && (
                      <span className="text-zinc-400 text-[10px] font-mono font-semibold bg-zinc-900/40 border border-zinc-850 px-2 py-0.5 rounded-lg">
                        Q {questionIndex}/{totalQuestions}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {totalQuestions > 0 && (
                <div className="w-full h-1.5 bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden neo-sunken">
                  <div 
                    className="h-full bg-gradient-to-r from-zinc-700 to-zinc-200 transition-all duration-300"
                    style={{ width: `${(questionIndex / totalQuestions) * 100}%` }}
                  />
                </div>
              )}

              {/* Prompt Text Container */}
              <div className="p-4 rounded-xl border border-zinc-900 bg-zinc-950/40 shadow-inner neo-sunken">
                <p className="text-xs text-text-prim leading-relaxed font-semibold">
                  {activeQuestion}
                </p>
              </div>

              {/* Response box and submission */}
              <div className="border-t border-zinc-900/60 pt-4 w-full">
                {evaluationFeedback ? (
                  <div className="space-y-4 animate-[scaleIn_0.3s_ease-out] w-full">
                    <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/20 rounded-xl space-y-3 shadow-inner">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                            AI Evaluation Complete
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-zinc-500">GRADE</span>
                          <div className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded-md">
                            <span className="text-sm font-heading font-extrabold text-emerald-400 font-mono">
                              {((evaluationFeedback.grade || 0) / 10).toFixed(1)} <span className="text-[9px] text-emerald-500/60">/ 10</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-text-sec leading-relaxed border-t border-zinc-900 pt-3">
                        {evaluationFeedback.feedback}
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center select-none gap-4">
                      {/* Keyboard hint hidden on touch layouts */}
                      <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-text-muted font-mono">
                        <Keyboard className="size-3.5 shrink-0" />
                        <span>Press <kbd className="px-1 rounded bg-zinc-900 border border-zinc-800">Enter</kbd> or <kbd className="px-1 rounded bg-zinc-900 border border-zinc-800">→</kbd></span>
                      </div>

                      <button
                        onClick={() => {
                          setTranscript('');
                          requestNextQuestion();
                        }}
                        className="px-4 py-2.5 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-750 hover:to-zinc-850 border border-zinc-700 text-text-prim font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-md w-full sm:w-auto"
                      >
                        <span>Next Question</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ) : isEvaluatingAnswer ? (
                  <div className="p-8 flex flex-col items-center justify-center space-y-4 select-none w-full border border-zinc-900 rounded-xl bg-zinc-950/20">
                    <div className="relative flex items-center justify-center size-12">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-indigo-400 animate-spin" />
                      <Sparkles className="size-5 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="space-y-2 text-center w-full max-w-xs">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider animate-pulse block">
                        AI Assessment Pipeline Active
                      </span>
                      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden w-full relative">
                        <div className="h-full bg-indigo-500 rounded-full w-2/3 animate-[loading_1.5s_infinite_ease-in-out]" />
                      </div>
                      <span className="text-[9px] text-text-muted font-mono block">
                        Measuring posture, expression & speech relevance...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 w-full">
                    <div className="flex justify-between items-center select-none">
                      <span className="text-xs font-semibold text-text-sec flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Response Box
                      </span>
                      <button
                        onClick={() => setShowTextSubmit(!showTextSubmit)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono uppercase underline cursor-pointer"
                      >
                        {showTextSubmit ? 'Use Voice Input' : 'Type Response Instead'}
                      </button>
                    </div>

                    {showTextSubmit ? (
                      <div className="space-y-3 animate-[scaleIn_0.2s_ease-out] w-full">
                        <textarea
                          value={typedAnswer}
                          onChange={(e) => setTypedAnswer(e.target.value)}
                          placeholder="Type your response here..."
                          rows={4}
                          className="w-full bg-zinc-950 border border-zinc-900 focus:border-zinc-750 rounded-xl p-3 text-xs text-text-prim outline-none resize-none font-sans transition-all neo-sunken"
                        />
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end select-none w-full gap-2">
                          <button
                            onClick={handleSpeechSubmit}
                            className="px-4 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none neo-raised neo-raised-hover neo-raised-active w-full sm:w-auto"
                          >
                            <span>Submit Response</span>
                            <CheckCircle className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 border border-zinc-900 bg-zinc-950/20 rounded-2xl flex flex-col items-stretch sm:items-center justify-center space-y-4 select-none w-full shadow-inner neo-sunken">
                        <div className="relative flex items-center justify-center size-12 mx-auto">
                          <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-ping opacity-60" />
                          <div className="relative size-8 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                            <Mic className="size-4.5 text-emerald-400 animate-[pulse_1.5s_infinite]" />
                          </div>
                        </div>
                        
                        <div className="text-center space-y-0.5">
                          <p className="text-xs font-semibold text-text-prim">
                            Speech recognition online.
                          </p>
                          <p className="text-[10px] text-text-muted">
                            Answer the question aloud. We will transcribe it below.
                          </p>
                        </div>
                        
                        {transcript.trim() ? (
                          <div className="w-full p-3.5 border border-zinc-900 bg-zinc-950 rounded-2xl text-left text-xs text-text-prim max-h-28 overflow-y-auto select-text font-mono transition-all neo-sunken border-l-emerald-500/30 animate-[scaleIn_0.2s_ease-out]">
                            <span className="text-[9px] text-emerald-400 font-bold block mb-1">Live Transcript:</span>
                            {transcript}
                          </div>
                        ) : (
                          <div className="text-[9px] font-mono text-text-muted italic border border-dashed border-zinc-850 px-4 py-1.5 rounded mx-auto">
                            (Speak to begin transcribing)
                          </div>
                        )}

                        <button
                          onClick={handleSpeechSubmit}
                          className="px-5 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none neo-raised neo-raised-hover neo-raised-active w-full sm:w-auto"
                        >
                          Submit Spoken Response
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Column (Col-Span 4): Telemetry Dashboard HUD */}
        <div className="lg:col-span-4 flex w-full">
          <MetricsSidebar layout="vertical" />
        </div>

      </div>

    </div>
  );
}