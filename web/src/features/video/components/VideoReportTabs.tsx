import { useState } from 'react';
import { PostureTimeline } from './PostureTimeline';
import type { PostureDataPoint } from './PostureTimeline';
import { EmotionHeatmap } from './EmotionHeatmap';
import type { EmotionWindowData } from './EmotionHeatmap';
import { SpeechReport } from './SpeechReport';
import type { TranscriptSegmentData } from './SpeechReport';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Eye, Smile, Volume2, Award } from 'lucide-react';

interface VideoReportTabsProps {
  postureData: PostureDataPoint[];
  postureAverage: number;
  gazePercentage: number;
  gazeFatigue: number;
  emotionTimeline: EmotionWindowData[];
  dominantEmotion: string;
  speechData: {
    wpm: number;
    filler_word_count: number;
    silence_ratio: number;
    clarity_score: number;
  };
  transcriptSegments: TranscriptSegmentData[];
  summaryData: {
    summary: string;
    key_strengths: string[];
    areas_for_improvement: string[];
  };
}

type TabType = 'posture' | 'gaze' | 'emotion' | 'speech' | 'summary';

export function VideoReportTabs({
  postureData,
  postureAverage,
  gazePercentage,
  gazeFatigue,
  emotionTimeline,
  dominantEmotion,
  speechData,
  transcriptSegments,
  summaryData,
}: VideoReportTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  const tabs = [
    { id: 'summary', label: 'Overall Summary', Icon: Award },
    { id: 'posture', label: 'Posture HUD', Icon: Activity },
    { id: 'gaze', label: 'Eye Gaze', Icon: Eye },
    { id: 'emotion', label: 'Emotion Heatmap', Icon: Smile },
    { id: 'speech', label: 'Speech/Voice', Icon: Volume2 },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Mobile Dropdown Switcher (Visible on small screen) */}
      <div className="md:hidden w-full select-none">
        <Select value={activeTab} onValueChange={(val) => setActiveTab(val as TabType)}>
          <SelectTrigger className="w-full bg-zinc-950/60 border border-zinc-900 text-xs py-4.5 rounded-lg focus:ring-0 focus:ring-offset-0 focus:border-zinc-850 transition-colors text-text-prim">
            <SelectValue placeholder="Select Report Section" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border border-zinc-900 text-xs text-text-prim">
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id} className="focus:bg-zinc-900 focus:text-text-prim cursor-pointer">
                <div className="flex items-center gap-2">
                  <tab.Icon className="size-4 shrink-0 text-zinc-400" />
                  <span>{tab.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Desktop Tab Bar Navigation (Visible on md and larger screen) */}
      <div className="hidden md:flex border border-zinc-900 bg-zinc-950/40 p-1.5 rounded-2xl gap-2 select-none items-center shadow-[inset_2px_2px_8px_rgba(0,0,0,0.8)] overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 flex-1 justify-center shrink-0 ${
                isActive
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 font-extrabold shadow-[2px_2px_10px_rgba(0,0,0,0.6)]'
                  : 'border border-transparent text-text-muted hover:text-text-sec hover:bg-zinc-900/20'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab Panels Container */}
      <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent top-0" />
        
        {/* Tab 1: Overall Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-text-muted uppercase tracking-wider">AI Executive Narrative</h4>
              <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl leading-relaxed text-xs text-text-sec whitespace-pre-wrap shadow-inner">
                {summaryData?.summary || 'AI Narrative summary is compiling. Standard aggregate analytics show normal engagement thresholds.'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Strengths */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5 select-none">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Key Strengths
                </h5>
                <ul className="text-xs text-text-sec space-y-2">
                  {summaryData?.key_strengths?.map((str, idx) => (
                    <li key={idx} className="flex gap-2 items-start leading-normal">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{str}</span>
                    </li>
                  )) || (
                    <li className="text-text-muted italic">Computing strengths details...</li>
                  )}
                </ul>
              </div>

              {/* Areas for Improvement */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5 select-none">
                  <span className="size-1.5 rounded-full bg-amber-400" />
                  Improvement Areas
                </h5>
                <ul className="text-xs text-text-sec space-y-2">
                  {summaryData?.areas_for_improvement?.map((imp, idx) => (
                    <li key={idx} className="flex gap-2 items-start leading-normal">
                      <span className="text-amber-500 font-bold">⚠</span>
                      <span>{imp}</span>
                    </li>
                  )) || (
                    <li className="text-text-muted italic">Computing suggestions details...</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Posture HUD */}
        {activeTab === 'posture' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl gap-4 select-none text-left shadow-inner">
              <div>
                <span className="text-[9px] font-mono text-text-muted uppercase">Average Posture Score</span>
                <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
                  {postureAverage.toFixed(0)}%
                </p>
              </div>
              <p className="text-xs text-text-sec max-w-md leading-normal">
                Good posture displays alert confidence and authority. Sitting straight prevents fatigue and maintains high vocal resonance.
              </p>
            </div>
            <PostureTimeline data={postureData} />
          </div>
        )}

        {/* Tab 3: Eye Gaze */}
        {activeTab === 'gaze' && (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-1 select-none shadow-inner">
                <span className="text-[9px] font-mono text-text-muted uppercase">Eye Gaze Frequency</span>
                <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
                  {gazePercentage.toFixed(0)}%
                </p>
                <p className="text-[10px] text-text-muted pt-1 leading-normal">
                  Reflects the percentage of frames where the user maintained straight eye contact with the camera.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-1 select-none shadow-inner">
                <span className="text-[9px] font-mono text-text-muted uppercase">PERCLOS Fatigue Score</span>
                <p className="text-2xl font-heading font-extrabold text-text-prim font-mono">
                  {(gazeFatigue * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-text-muted pt-1 leading-normal">
                  Percentage of Eye Closure index measuring blink duration and eye fatigue states.
                </p>
              </div>
            </div>

            <div className="p-5 bg-zinc-900/10 border border-zinc-900 rounded-xl space-y-3 shadow-inner">
              <h5 className="text-[11px] font-mono font-bold text-text-sec uppercase tracking-wider select-none">
                Gaze Analytics Explanation
              </h5>
              <p className="text-xs text-text-sec leading-relaxed">
                Looking directly at the lens builds direct rapport and presence with remote panel interviewers. 
                Excessive drifting (looking down, left, or right frequently) indicates hesitation or memory scanning, which can be perceived as lack of preparation.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Emotion Heatmap */}
        {activeTab === 'emotion' && (
          <EmotionHeatmap timeline={emotionTimeline} dominantEmotion={dominantEmotion} />
        )}

        {/* Tab 5: Speech/Voice */}
        {activeTab === 'speech' && (
          <SpeechReport
            wpm={speechData.wpm}
            fillerWordCount={speechData.filler_word_count}
            silenceRatio={speechData.silence_ratio}
            clarityScore={speechData.clarity_score}
            transcriptSegments={transcriptSegments}
          />
        )}

      </div>
    </div>
  );
}