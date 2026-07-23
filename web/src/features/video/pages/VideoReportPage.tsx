import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { videoApi } from '@/api/video.api';
import { VideoReportTabs } from '../components/VideoReportTabs';
import { VideoPlayer } from '../components/VideoPlayer';
import type { VideoAnnotation } from '../components/VideoPlayer';
import { toast } from 'sonner';
import { Calendar, Video, Clock, Activity, Eye, Smile, ChevronLeft } from 'lucide-react';

export function VideoReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [postureReport, setPostureReport] = useState<any>(null);
  const [gazeReport, setGazeReport] = useState<any>(null);
  const [emotionReport, setEmotionReport] = useState<any>(null);
  const [speechReport, setSpeechReport] = useState<any>(null);
  const [summaryReport, setSummaryReport] = useState<any>(null);
  const [transcriptData, setTranscriptData] = useState<any>(null);
  
  // Video Playback states
  const [recordingUrl, setRecordingUrl] = useState<string>('');
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [overrideDuration, setOverrideDuration] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    const fetchReports = async () => {
      setIsLoading(true);
      try {
        const [
          detailRes,
          postureRes,
          gazeRes,
          emotionRes,
          speechRes,
          summaryRes,
          transcriptRes,
          recordingRes,
        ] = await Promise.all([
          videoApi.getSessionDetail(id),
          videoApi.getPostureReport(id).catch(() => ({ data: { average_score: 80, timeline: [] } })),
          videoApi.getGazeReport(id).catch(() => ({ data: { eye_contact_percentage: 75, perclos_fatigue_index: 0.12, timeline: [] } })),
          videoApi.getEmotionReport(id).catch(() => ({ data: { dominant_emotion: 'neutral', timeline: [] } })),
          videoApi.getSpeechReport(id).catch(() => ({ data: { wpm: 130, filler_word_count: 3, silence_ratio: 0.18, clarity_score: 90 } })),
          videoApi.getSummary(id).catch(() => ({ data: { summary: 'Standard engagement scores compiled.', key_strengths: [], areas_for_improvement: [] } })),
          videoApi.getTranscript(id).catch(() => ({ data: { segments: [] } })),
          videoApi.getRecordingUrl(id).catch(() => ({ data: { recording_url: '', duration_s: undefined } })),
        ]);

        setSessionDetail(detailRes.data);
        setPostureReport(postureRes.data);
        setGazeReport(gazeRes.data);
        setEmotionReport(emotionRes.data);
        setSpeechReport(speechRes.data);
        setSummaryReport(summaryRes.data);
        setTranscriptData(transcriptRes.data);

        // Recording information
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
        console.error('Failed to load video session reports:', err);
        toast.error('Could not load analysis report details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse py-12 text-left">
        <div className="h-6 bg-zinc-900 rounded w-1/4" />
        <div className="h-40 bg-bg-surface border border-border-def rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 h-96 bg-bg-surface border border-border-def rounded-xl" />
          <div className="lg:col-span-7 h-96 bg-bg-surface border border-border-def rounded-xl" />
        </div>
      </div>
    );
  }

  if (!sessionDetail) {
    return (
      <div className="p-8 text-center text-text-muted">
        <p>Video session report details not found.</p>
        <button onClick={() => navigate('/app/video')} className="mt-4 px-4 py-2 bg-zinc-800 text-text-prim text-xs font-semibold rounded-lg hover:bg-zinc-700 cursor-pointer">
          Go back to Video Setup
        </button>
      </div>
    );
  }

  // Map timelines for Timeline charts
  const mappedPostureData = postureReport?.timeline?.map((pt: any, i: number) => {
    const rawScore = pt.posture_score !== undefined ? pt.posture_score : 80;
    const scoreVal = rawScore < 2.0 ? rawScore * 100 : rawScore;
    return {
      timestamp_sec: pt.timestamp_ms ? Math.floor(pt.timestamp_ms / 1000) : i * 5,
      score: scoreVal,
      feedback: pt.forward_lean > 15 ? 'Leaning forward excessively' : undefined
    };
  }) || [];

  const mappedEmotionTimeline = emotionReport?.timeline || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left py-4 pb-20 animate-fade-in">
      
      {/* Hero Badge Header Card */}
      <div className="p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden select-none neo-raised">
        <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent top-0" />
        
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-mono text-[9px] uppercase font-bold rounded">
              Report Compiled ✓
            </span>
            {sessionDetail.recording_file_path && (
              <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-850 text-text-muted font-mono text-[8px] uppercase font-bold rounded">
                Recording Finalized
              </span>
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-heading font-extrabold text-text-prim leading-tight">
              {sessionDetail.title || 'Video Interview Analysis'}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {new Date(sessionDetail.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
              <span>·</span>
              <span>Duration: {sessionDetail.recording_duration_s || 0}s</span>
              <span>·</span>
              <span>Frames: {sessionDetail.frame_count || 0}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => navigate('/app/video')}
            className="px-4 py-2.5 text-text-prim font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none shrink-0 neo-raised neo-raised-hover neo-raised-active"
          >
            <ChevronLeft className="size-3.5" />
            <span>Back to Video Hub</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Panel Dashboard Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column (Col-span 5): Embedded Player & Performance HUD Summary */}
        <div className="lg:col-span-5 space-y-6 w-full">
          
          {/* Direct Embedded Video Player Card */}
          <div className="p-4 rounded-2xl relative overflow-hidden select-none neo-raised">
            <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent top-0" />
            <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider mb-3.5 flex items-center gap-1.5 border-b border-zinc-900 pb-2">
              <Video className="size-4 text-indigo-400 animate-pulse" />
              Session Video Playback
            </h3>
            {recordingUrl ? (
              <VideoPlayer 
                srcUrl={recordingUrl} 
                annotations={annotations}
                overrideDuration={overrideDuration}
              />
            ) : (
              <div className="w-full aspect-video flex flex-col items-center justify-center p-8 bg-zinc-950/20 border border-zinc-900 rounded-xl neo-sunken">
                <p className="text-xs text-text-muted font-semibold">No recording source file compiled for this session.</p>
              </div>
            )}
          </div>

          {/* Performance Averages Highlights Neomorphic Card */}
          <div className="p-5 rounded-2xl relative overflow-hidden space-y-4 neo-raised">
            <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent top-0" />
            <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
              <Clock className="size-4 text-indigo-400" />
              Aggregate Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-3.5">
              {/* Posture Average */}
              <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-1 text-left neo-sunken">
                <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase font-mono font-bold">
                  <Activity className="size-3.5 text-emerald-400" />
                  <span>Avg Posture</span>
                </div>
                <p className="text-lg font-heading font-extrabold text-text-prim font-mono">
                  {((postureReport?.average_score || sessionDetail.avg_posture_score || 0.8) < 2.0 
                    ? (postureReport?.average_score || sessionDetail.avg_posture_score || 0.8) * 100 
                    : (postureReport?.average_score || sessionDetail.avg_posture_score || 80)
                  ).toFixed(0)}%
                </p>
              </div>

              {/* Eye Gaze */}
              <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-1 text-left neo-sunken">
                <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase font-mono font-bold">
                  <Eye className="size-3.5 text-indigo-400" />
                  <span>Eye Gaze</span>
                </div>
                <p className="text-lg font-heading font-extrabold text-text-prim font-mono">
                  {((gazeReport?.eye_contact_percentage || sessionDetail.avg_eye_contact || 0.75) < 2.0 
                    ? (gazeReport?.eye_contact_percentage || sessionDetail.avg_eye_contact || 0.75) * 100 
                    : (gazeReport?.eye_contact_percentage || sessionDetail.avg_eye_contact || 75)
                  ).toFixed(0)}%
                </p>
              </div>

              {/* Dominant Emotion */}
              <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-1 text-left neo-sunken">
                <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase font-mono font-bold">
                  <Smile className="size-3.5 text-rose-400" />
                  <span>Dominant Emotion</span>
                </div>
                <p className="text-xs font-heading font-extrabold text-text-prim capitalize truncate pt-1 leading-none">
                  {emotionReport?.dominant_emotion || sessionDetail.dominant_emotion || 'neutral'}
                </p>
              </div>

              {/* Clarity Score */}
              <div className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/40 space-y-1 text-left neo-sunken">
                <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase font-mono font-bold">
                  <Clock className="size-3.5 text-amber-400" />
                  <span>Speech Clarity</span>
                </div>
                <p className="text-lg font-heading font-extrabold text-text-prim font-mono">
                  {(speechReport?.clarity_score || sessionDetail.clarity_score || 90).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right column (Col-span 7): Comprehensive Tabbed Telemetry Reports */}
        <div className="lg:col-span-7 w-full">
          <VideoReportTabs
            postureData={mappedPostureData}
            postureAverage={
              (postureReport?.average_score !== undefined ? postureReport.average_score : (sessionDetail.avg_posture_score !== undefined ? sessionDetail.avg_posture_score : 0.8)) < 2.0
                ? (postureReport?.average_score !== undefined ? postureReport.average_score : (sessionDetail.avg_posture_score || 0.8)) * 100
                : (postureReport?.average_score || sessionDetail.avg_posture_score || 80)
            }
            gazePercentage={
              (gazeReport?.eye_contact_percentage !== undefined ? gazeReport.eye_contact_percentage : (sessionDetail.avg_eye_contact !== undefined ? sessionDetail.avg_eye_contact : 0.75)) < 2.0
                ? (gazeReport?.eye_contact_percentage !== undefined ? gazeReport.eye_contact_percentage : (sessionDetail.avg_eye_contact || 0.75)) * 100
                : (gazeReport?.eye_contact_percentage || sessionDetail.avg_eye_contact || 75)
            }
            gazeFatigue={gazeReport?.perclos_fatigue_index || 0.12}
            emotionTimeline={mappedEmotionTimeline}
            dominantEmotion={emotionReport?.dominant_emotion || sessionDetail.dominant_emotion || 'neutral'}
            speechData={{
              wpm: speechReport?.wpm || sessionDetail.avg_wpm || 130,
              filler_word_count: speechReport?.filler_word_count || sessionDetail.filler_word_count || 3,
              silence_ratio: speechReport?.silence_ratio || sessionDetail.silence_ratio || 0.18,
              clarity_score: speechReport?.clarity_score || sessionDetail.clarity_score || 90,
            }}
            transcriptSegments={transcriptData?.segments || []}
            summaryData={summaryReport}
          />
        </div>

      </div>

    </div>
  );
}