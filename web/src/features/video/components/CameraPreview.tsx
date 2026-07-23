import React, { useState, useEffect } from 'react';
import type { PermissionState } from '../hooks/useMediaStream';
import { Camera, AlertCircle } from 'lucide-react';
import { RecordingTimer } from './RecordingTimer';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  permissionState: PermissionState;
  isMirrored?: boolean;
  isRecording?: boolean;
}

export function CameraPreview({ 
  videoRef, 
  permissionState, 
  isMirrored = true,
  isRecording = false
}: CameraPreviewProps) {
  const [showGuide, setShowGuide] = useState(true);

  // Fade out the framing guides after 5 seconds
  useEffect(() => {
    if (permissionState !== 'granted') return;
    
    setShowGuide(true);
    const timer = setTimeout(() => {
      setShowGuide(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [permissionState]);

  if (permissionState === 'denied') {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center p-8 bg-zinc-900/40 border border-red-500/20 rounded-xl text-center shadow-lg backdrop-blur select-none">
        <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4 animate-pulse">
          <AlertCircle className="size-6 text-red-400" />
        </div>
        <h4 className="text-sm font-heading font-extrabold text-text-prim uppercase tracking-wider">
          Camera Access Blocked
        </h4>
        <p className="text-[11px] text-text-muted max-w-sm mt-2 leading-relaxed">
          Please check your browser settings and enable camera and microphone permissions to start the practice session.
        </p>
        <ol className="text-[10px] text-text-sec text-left list-decimal list-inside space-y-1 mt-4 border-t border-border-subtle/40 pt-4 w-full max-w-xs">
          <li>Click the lock icon next to your URL.</li>
          <li>Set camera & microphone permissions to <strong>Allow</strong>.</li>
          <li>Refresh this page and try again.</li>
        </ol>
      </div>
    );
  }

  if (permissionState === 'requesting') {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-950/80 border border-zinc-800 rounded-xl relative overflow-hidden select-none">
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <div className="size-64 rounded-full border border-violet-500/10 animate-[ping_3s_infinite]" />
        </div>
        <div className="size-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg relative">
          <div className="absolute inset-0 rounded-full border border-t-zinc-400 animate-spin" />
          <Camera className="size-6 text-zinc-400 animate-pulse" />
        </div>
        <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full mt-4 animate-pulse shadow-md">
          Awaiting webcam permission...
        </span>
      </div>
    );
  }

  if (permissionState === 'idle') {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-950/40 border border-zinc-800 rounded-xl relative overflow-hidden select-none shadow-lg">
        <div className="size-12 rounded-full bg-zinc-900/60 border border-zinc-850 flex items-center justify-center mb-3">
          <Camera className="size-5 text-zinc-500" />
        </div>
        <p className="text-[11px] text-text-muted">Camera device stream is currently offline.</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video relative bg-[#010103] rounded-xl border border-zinc-800/80 overflow-hidden shadow-2xl group">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover rounded-xl transition-all duration-300 ${isMirrored ? 'transform scale-x-[-1]' : ''}`}
      />

      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_55%,rgba(0,0,0,0.65)_100%)] opacity-85 mix-blend-multiply" />

      {/* Rule-of-Thirds Grid Guide */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ease-in-out ${showGuide ? 'opacity-100' : 'opacity-0'}`}>
        {/* Horizontal Lines */}
        <div className="absolute top-[33.3%] left-0 right-0 h-px border-t border-dashed border-zinc-400/20" />
        <div className="absolute top-[66.6%] left-0 right-0 h-px border-t border-dashed border-zinc-400/20" />
        
        {/* Vertical Lines */}
        <div className="absolute left-[33.3%] top-0 bottom-0 w-px border-l border-dashed border-zinc-400/20" />
        <div className="absolute left-[66.6%] top-0 bottom-0 w-px border-l border-dashed border-zinc-400/20" />
        
        {/* Center alignment guide */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="size-6 border border-zinc-400/15 rounded-full" />
          <div className="absolute w-2 h-px bg-zinc-400/20" />
          <div className="absolute h-2 w-px bg-zinc-400/20" />
        </div>
      </div>

      {/* Grid Status Badge (re-shows guide on hover) */}
      <button 
        onClick={() => { setShowGuide(true); setTimeout(() => setShowGuide(false), 3000); }}
        className="absolute top-4 right-4 flex items-center justify-center p-1.5 bg-zinc-950/60 border border-zinc-800 rounded-md text-text-muted hover:text-text-prim hover:bg-zinc-900 transition-all select-none opacity-0 group-hover:opacity-100 cursor-pointer"
        title="Show Alignment Guide"
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1">Grid</span>
      </button>

      {/* Live Feed Status Indicator */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/80 border border-zinc-800 text-emerald-400 font-mono text-[9px] uppercase font-bold rounded-md backdrop-blur select-none z-10 shadow-lg">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
        Live Feed
      </div>

      {/* Recording Timer Component */}
      <RecordingTimer isActive={isRecording} />
    </div>
  );
}