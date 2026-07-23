import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoApi } from '@/api/video.api';
import { VideoPlayer } from '../components/VideoPlayer';
import type { VideoAnnotation } from '../components/VideoPlayer';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Activity, Eye, Smile, AlertCircle } from 'lucide-react';

export function VideoPlaybackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [overrideDuration, setOverrideDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [
          recordingRes,
          postureRes,
          gazeRes,
          emotionRes,
        ] = await Promise.all([
          videoApi.getRecordingUrl(id).catch(() => ({ data: { recording_url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', duration_s: undefined } })),
          videoApi.getPostureReport(id).catch(() => ({ data: { timeline: [] } })),
          videoApi.getGazeReport(id).catch(() => ({ data: { timeline: [] } })),
          videoApi.getEmotionReport(id).catch(() => ({ data: { timeline: [] } })),
        ]);

        // Grab recording url
        setRecordingUrl(recordingRes.data?.recording_url || '');
        if (recordingRes.data?.duration_s) {
          setOverrideDuration(recordingRes.data.duration_s);
        }

        // Compile timeline events / annotations with 30-second spacing and maximum 6 markers per category
        const list: VideoAnnotation[] = [];
        
        // 1. Posture issues: posture_score < 70 (prioritized by severity)
        const postureAnomalies = (postureRes.data?.timeline || [])
          .filter((pt: any) => pt.posture_score !== undefined)
          .map((pt: any) => {
            const pct = pt.posture_score < 2.0 ? pt.posture_score * 100 : pt.posture_score;
            return {
              timestamp_s: Math.floor(pt.timestamp_ms / 1000),
              score: pct,
              label: 'Slouching detected',
            };
          })
          .filter((pt: any) => pt.score < 70);
        
        postureAnomalies.sort((a: any, b: any) => a.score - b.score); // Lower score is worse posture (more severe)
        
        const selectedPosture: VideoAnnotation[] = [];
        postureAnomalies.forEach((pt: any) => {
          if (selectedPosture.length >= 6) return;
          const isTooClose = selectedPosture.some(
            (sel) => Math.abs(sel.timestamp_s - pt.timestamp_s) < 30
          );
          if (!isTooClose) {
            selectedPosture.push({
              timestamp_s: pt.timestamp_s,
              type: 'posture',
              label: pt.label,
            });
          }
        });
        list.push(...selectedPosture);

        // 2. Poor eye contact: eye_contact_score < 60 (prioritized by severity)
        const gazeAnomalies = (gazeRes.data?.timeline || [])
          .filter((g: any) => g.eye_contact_score !== undefined)
          .map((g: any) => {
            const pct = g.eye_contact_score < 2.0 ? g.eye_contact_score * 100 : g.eye_contact_score;
            return {
              timestamp_s: Math.floor(g.timestamp_ms / 1000),
              score: pct,
              label: 'Drifting eye contact',
            };
          })
          .filter((g: any) => g.score < 60);

        gazeAnomalies.sort((a: any, b: any) => a.score - b.score); // Lower score is worse eye contact

        const selectedGaze: VideoAnnotation[] = [];
        gazeAnomalies.forEach((g: any) => {
          if (selectedGaze.length >= 6) return;
          const isTooClose = selectedGaze.some(
            (sel) => Math.abs(sel.timestamp_s - g.timestamp_s) < 30
          );
          if (!isTooClose) {
            selectedGaze.push({
              timestamp_s: g.timestamp_s,
              type: 'gaze',
              label: g.label,
            });
          }
        });
        list.push(...selectedGaze);

        // 3. Stress / Anxiety indicators (emotion events)
        const emotionAnomalies = (emotionRes.data?.timeline || [])
          .filter((e: any) => e.dominant_emotion === 'nervous' || e.dominant_emotion === 'fear')
          .map((e: any) => ({
            timestamp_s: Math.floor(e.start_time_s || 0),
            label: `High anxiety (${e.dominant_emotion})`,
          }));

        const selectedEmotion: VideoAnnotation[] = [];
        emotionAnomalies.forEach((e: any) => {
          if (selectedEmotion.length >= 6) return;
          const isTooClose = selectedEmotion.some(
            (sel) => Math.abs(sel.timestamp_s - e.timestamp_s) < 30
          );
          if (!isTooClose) {
            selectedEmotion.push({
              timestamp_s: e.timestamp_s,
              type: 'emotion',
              label: e.label,
            });
          }
        });
        list.push(...selectedEmotion);

        const sortedList = list.sort((a, b) => a.timestamp_s - b.timestamp_s);
        setAnnotations(sortedList);
      } catch (err) {
        console.error('Failed to load playback data:', err);
        toast.error('Failed to load session recording media.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [id]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getAnnotationIcon = (type: string) => {
    if (type === 'posture') return <Activity className="size-3.5 text-emerald-400" />;
    if (type === 'gaze') return <Eye className="size-3.5 text-indigo-400" />;
    return <Smile className="size-3.5 text-rose-400" />;
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse py-12 text-left">
        <div className="h-6 bg-zinc-900 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 h-80 bg-bg-surface border border-border-def rounded-xl" />
          <div className="lg:col-span-4 h-80 bg-bg-surface border border-border-def rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left py-4 pb-20 animate-fade-in">
      
      {/* Playback Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-4 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/app/video/${id}/report`)}
            className="p-2 rounded-xl hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 transition-all cursor-pointer text-text-sec neo-raised"
          >
            <ArrowLeft className="size-4 shrink-0" />
          </button>
          <div>
            <h2 className="text-sm font-heading font-extrabold text-text-prim uppercase tracking-wider">
              Session Recording Playback
            </h2>
            <p className="text-[10px] text-text-muted mt-0.5">
              Review posture anomalies and eye-contact drift timestamps sync checks
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Custom video player left, annotations timeline list right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Video player with custom scrubber */}
        <div className="lg:col-span-8 flex flex-col justify-center">
          {recordingUrl ? (
            <VideoPlayer 
              srcUrl={recordingUrl} 
              annotations={annotations}
              onTimeUpdate={setCurrentTime}
              overrideDuration={overrideDuration}
            />
          ) : (
            <div className="w-full aspect-video flex flex-col items-center justify-center p-8 bg-zinc-950/40 border border-zinc-900 rounded-xl select-none neo-sunken">
              <AlertCircle className="size-8 text-text-muted mb-2 animate-pulse" />
              <p className="text-xs text-text-muted">Recording source file is not finalized.</p>
            </div>
          )}
        </div>

        {/* Right Side: Annotations sidebar list log */}
        <div className="lg:col-span-4 p-5 rounded-2xl space-y-4 flex flex-col justify-between max-h-[420px] overflow-hidden select-none neo-raised">
          
          <div className="space-y-4 overflow-hidden flex flex-col h-full">
            <h3 className="text-xs font-semibold text-text-sec uppercase tracking-wider shrink-0 border-b border-zinc-900 pb-2">
              Behavioral Events Log ({annotations.length})
            </h3>
            
            {annotations.length > 0 ? (
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 no-scrollbar">
                {annotations.map((ann, idx) => {
                  const isCurrent = Math.abs(currentTime - ann.timestamp_s) < 2;
                  let borderClass = 'border-zinc-900 hover:border-zinc-800 bg-zinc-950/20 neo-raised neo-raised-hover';
                  if (isCurrent) borderClass = 'border-zinc-750 bg-zinc-900/40 neo-sunken';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 border rounded-xl flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${borderClass}`}
                      onClick={() => {
                        const video = document.querySelector('video');
                        if (video) {
                          video.currentTime = ann.timestamp_s;
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {getAnnotationIcon(ann.type)}
                        <span className="font-semibold text-text-prim">{ann.label}</span>
                      </div>
                      <span className="font-mono text-[9px] text-text-muted flex items-center gap-1">
                        <Clock className="size-3 shrink-0" />
                        {formatTime(ann.timestamp_s)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-text-muted text-center py-10 flex-1">
                No behavioral events or slouching thresholds triggered.
              </p>
            )}
          </div>

          <div className="text-[9px] font-mono text-text-muted border-t border-zinc-900 pt-3">
            Click any event card above to seek video timeline.
          </div>

        </div>

      </div>

    </div>
  );
}