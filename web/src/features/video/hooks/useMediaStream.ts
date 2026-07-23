import { useState, useEffect, useRef, useCallback } from 'react';

export type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied';

export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('idle');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // List available media devices (video inputs only)
  const refreshDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedVideoDeviceId) {
        setSelectedVideoDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to list video devices:', err);
    }
  }, [selectedVideoDeviceId]);

  // Request permissions and start the video stream
  const startStream = useCallback(async (deviceId?: string) => {
    setPermissionState('requesting');
    
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: true,
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermissionState('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      // Refresh list of devices to include names now that permission is granted
      refreshDevices();
    } catch (err) {
      console.error('Webcam permission denied or device error:', err);
      setPermissionState('denied');
      setStream(null);
    }
  }, [refreshDevices]);

  // Stop the current active stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setPermissionState('idle');
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Bind the stream to the video element whenever they are both available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, permissionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    stream,
    permissionState,
    devices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    videoRef,
    startStream,
    stopStream,
    refreshDevices,
  };
}