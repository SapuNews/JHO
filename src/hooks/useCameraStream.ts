import { useState, useEffect, useRef, useCallback } from "react";
import { BroadcastSettings, RESOLUTION_PRESETS } from "../types";

export function useCameraStream(settings: BroadcastSettings) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<{ peakDb: number; rmsDb: number }>({ peakDb: -60, rmsDb: -60 });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecordingLocal, setIsRecordingLocal] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingTimerRef = useRef<number | null>(null);

  // Initialize and enumerate devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter((d) => d.kind === "videoinput");
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !activeDeviceId) {
          const backCam = videoDevs.find(d => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("trás") || d.label.toLowerCase().includes("rear"));
          setActiveDeviceId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
        }
      } catch (err) {
        console.warn("Could not enumerate devices yet:", err);
      }
    }
    getDevices();
  }, [activeDeviceId]);

  // Request / Restart Camera Stream when resolution, device, or audio settings change
  const startStream = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }

      const res = RESOLUTION_PRESETS[settings.resolution] || RESOLUTION_PRESETS["1080p30"];

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: res.width },
        height: { ideal: res.height },
        frameRate: { ideal: res.fps, max: res.fps },
      };

      if (activeDeviceId) {
        videoConstraints.deviceId = { exact: activeDeviceId };
      } else {
        videoConstraints.facingMode = { ideal: settings.facingMode };
      }

      const audioConstraints: MediaTrackConstraints | boolean = settings.audioEnabled
        ? {
            sampleRate: { ideal: settings.sampleRate },
            channelCount: { ideal: settings.channels },
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: true,
          }
        : false;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });

      setStream(mediaStream);
      setHasPermission(true);
      setError(null);

      // Check capabilities of video track
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = typeof videoTrack.getCapabilities === "function" ? videoTrack.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
        if (capabilities.zoom) {
          setZoomCapabilities({
            min: capabilities.zoom.min || 1,
            max: capabilities.zoom.max || 8,
            step: capabilities.zoom.step || 0.1,
          });
        }
      }

      // Setup Web Audio Analyser for accurate VU Meter
      if (settings.audioEnabled && mediaStream.getAudioTracks().length > 0) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(mediaStream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(dataArray);

            let sum = 0;
            let peak = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const floatVal = (dataArray[i] - 128) / 128;
              const absVal = Math.abs(floatVal);
              if (absVal > peak) peak = absVal;
              sum += floatVal * floatVal;
            }
            const rms = Math.sqrt(sum / dataArray.length);

            // Convert to dB
            const peakDb = peak > 0.0001 ? 20 * Math.log10(peak) : -60;
            const rmsDb = rms > 0.0001 ? 20 * Math.log10(rms) : -60;

            setAudioLevel({
              peakDb: Math.max(-60, Math.min(0, peakDb)),
              rmsDb: Math.max(-60, Math.min(0, rmsDb)),
            });

            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };

          updateAudioLevel();
        } catch (e) {
          console.warn("Audio analyser setup error:", e);
        }
      }

    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      setError(err.message || "Erro ao acessar câmera e microfone");
    }
  }, [settings.resolution, settings.facingMode, settings.audioEnabled, settings.sampleRate, settings.channels, settings.echoCancellation, settings.noiseSuppression, activeDeviceId]);

  useEffect(() => {
    startStream();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [startStream]);

  // Apply torch
  const toggleTorch = useCallback(async (enable: boolean) => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && typeof (videoTrack as any).applyConstraints === "function") {
      try {
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: enable }],
        });
      } catch (e) {
        console.warn("Torch not supported on this device/track:", e);
      }
    }
  }, [stream]);

  // Apply zoom
  const setZoomLevel = useCallback(async (zoomValue: number) => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && typeof (videoTrack as any).applyConstraints === "function") {
      try {
        await (videoTrack as any).applyConstraints({
          advanced: [{ zoom: zoomValue }],
        });
      } catch (e) {
        console.warn("Zoom constraint error:", e);
      }
    }
  }, [stream]);

  // Switch Camera lens (Flip Front / Back)
  const flipCamera = useCallback(async () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === activeDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setActiveDeviceId(devices[nextIndex].deviceId);
  }, [devices, activeDeviceId]);

  // Local Recording (Simultaneous Broadcast & High-Res Storage)
  const startRecording = useCallback(() => {
    if (!stream) return;
    try {
      recordedChunksRef.current = [];
      const mimeTypes = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/webm;codecs=h264,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 8000000 } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime || "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, "-");
        a.download = `larix-broadcast-${timestamp}.${selectedMime.includes("mp4") ? "mp4" : "webm"}`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start(1000); // 1-second chunks for safety
      mediaRecorderRef.current = recorder;
      setIsRecordingLocal(true);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error("Failed to start local recording:", e);
    }
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecordingLocal(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // Take high resolution photo snapshot
  const takeSnapshot = useCallback(() => {
    if (!stream) return null;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const videoElem = document.createElement("video");
    videoElem.srcObject = stream;
    videoElem.play();

    const canvas = document.createElement("canvas");
    const settings = videoTrack.getSettings();
    canvas.width = settings.width || 1920;
    canvas.height = settings.height || 1080;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `larix-snapshot-${Date.now()}.jpg`;
      a.click();
      return dataUrl;
    }
    return null;
  }, [stream]);

  return {
    stream,
    devices,
    activeDeviceId,
    setActiveDeviceId,
    hasPermission,
    error,
    zoomCapabilities,
    hasTorch,
    audioLevel,
    startStream,
    toggleTorch,
    setZoomLevel,
    flipCamera,
    startRecording,
    stopRecording,
    isRecordingLocal,
    recordingDuration,
    takeSnapshot,
  };
}
