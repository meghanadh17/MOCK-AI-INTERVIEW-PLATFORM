import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

export interface VideoAnnotation {
  timestamp_s: number;
  type: 'posture' | 'gaze' | 'emotion';
  label: string;
}

interface VideoPlayerProps {
  srcUrl: string;
  annotations: VideoAnnotation[];
  onTimeUpdate?: (currentTimeS: number) => void;
  overrideDuration?: number;
}

export function VideoPlayer({ srcUrl, annotations, onTimeUpdate, overrideDuration }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.duration && isFinite(video.duration)) {
      setDuration(video.duration);
    } else {
      // Chrome/Firefox WebM duration discovery hack: seek to far end to force browser metadata parse
      video.currentTime = 1e101;
      
      const onTimeUpdateTemp = () => {
        video.removeEventListener('timeupdate', onTimeUpdateTemp);
        if (video.duration && isFinite(video.duration)) {
          setDuration(video.duration);
        } else if (overrideDuration) {
          setDuration(overrideDuration);
        }
        video.currentTime = 0;
      };
      
      video.addEventListener('timeupdate', onTimeUpdateTemp);
    }
  };

  const seekTo = (timeS: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeS;
    setCurrentTime(timeS);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    if ((!duration || !isFinite(duration)) && overrideDuration && isFinite(overrideDuration)) {
      setDuration(overrideDuration);
    }
  }, [overrideDuration, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="w-full relative bg-black rounded-xl overflow-hidden border border-border-strong shadow-2xl flex flex-col group select-none">
      
      {/* HTML5 video element */}
      <video
        ref={videoRef}
        src={srcUrl}
        className="w-full aspect-video object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
      />

      {/* Scrubber and Timeline Timeline marker overlay */}
      <div className="px-4 py-2 bg-zinc-950/90 border-t border-border-subtle/40 space-y-2 relative z-10">
        
        {/* Scrubber slider bar */}
        <div className="relative h-5 flex items-center group/scrub cursor-pointer w-full">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full custom-scrubber outline-none"
            style={{ '--range-progress': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
          />

          {/* Render Annotation Markers on the scrubber timeline */}
          {duration > 0 && annotations.map((ann, idx) => {
            const percent = (ann.timestamp_s / duration) * 100;
            let dotColor = 'bg-indigo-500 hover:bg-indigo-400 border-indigo-400/50';
            if (ann.type === 'posture') dotColor = 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400/50';
            if (ann.type === 'emotion') dotColor = 'bg-rose-500 hover:bg-rose-400 border-rose-400/50';

            return (
              <div
                key={idx}
                className="absolute group/marker cursor-pointer top-1/2 -translate-y-1/2 z-20 hover:z-50"
                style={{ left: `calc(${percent}% - 4px)` }}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(ann.timestamp_s);
                }}
              >
                {/* Sleek circle marker dot with scale transition on hover */}
                <div 
                  className={`w-2 h-2 rounded-full border border-black/80 shadow-[0_0_4px_rgba(0,0,0,0.6)] ${dotColor} transition-all duration-150 group-hover/marker:scale-125 group-hover/marker:shadow-[0_0_6px_rgba(255,255,255,0.4)]`}
                />

                {/* Premium Animated Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center pointer-events-none select-none z-50 opacity-0 translate-y-1 group-hover/marker:opacity-100 group-hover/marker:translate-y-0 transition-all duration-150">
                  <div className="bg-zinc-900/95 border border-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap text-[10px] flex items-center gap-2 backdrop-blur-md">
                    <span className="font-mono text-[9px] text-zinc-300 font-bold bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">
                      {formatTime(ann.timestamp_s)}
                    </span>
                    <span className="font-medium text-zinc-200">{ann.label}</span>
                  </div>
                  {/* Tooltip arrow */}
                  <div className="w-1.5 h-1.5 bg-zinc-900 border-r border-b border-zinc-800 rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Media Controls Bar */}
        <div className="flex items-center justify-between text-xs text-text-sec pt-1">
          <div className="flex items-center gap-4">
            <button 
              onClick={togglePlay} 
              className="p-1 text-zinc-100 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-border-subtle rounded-md transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="size-4 shrink-0" /> : <Play className="size-4 shrink-0" />}
            </button>
            <span className="font-mono select-none text-[10px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={toggleMute} 
                className="p-1 hover:bg-zinc-900 border border-transparent hover:border-border-subtle rounded-md transition-all cursor-pointer"
              >
                {isMuted ? <VolumeX className="size-4 shrink-0 text-red-400" /> : <Volume2 className="size-4 shrink-0" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            <button 
              onClick={toggleFullscreen} 
              className="p-1 hover:bg-zinc-900 border border-transparent hover:border-border-subtle rounded-md transition-all cursor-pointer"
            >
              <Maximize2 className="size-4 shrink-0" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}