export type VideoResolution = "4k" | "1080p60" | "1080p30" | "720p60" | "720p30" | "480p30";

export interface ResolutionConfig {
  id: VideoResolution;
  label: string;
  width: number;
  height: number;
  fps: number;
  recommendedBitrate: number; // in kbps
}

export const RESOLUTION_PRESETS: Record<VideoResolution, ResolutionConfig> = {
  "4k": { id: "4k", label: "4K UHD (3840x2160 @ 30fps)", width: 3840, height: 2160, fps: 30, recommendedBitrate: 15000 },
  "1080p60": { id: "1080p60", label: "Full HD (1920x1080 @ 60fps)", width: 1920, height: 1080, fps: 60, recommendedBitrate: 6000 },
  "1080p30": { id: "1080p30", label: "Full HD (1920x1080 @ 30fps)", width: 1920, height: 1080, fps: 30, recommendedBitrate: 4500 },
  "720p60": { id: "720p60", label: "HD (1280x720 @ 60fps)", width: 1280, height: 720, fps: 60, recommendedBitrate: 3500 },
  "720p30": { id: "720p30", label: "HD (1280x720 @ 30fps)", width: 1280, height: 720, fps: 30, recommendedBitrate: 2500 },
  "480p30": { id: "480p30", label: "SD (854x480 @ 30fps)", width: 854, height: 480, fps: 30, recommendedBitrate: 1200 },
};

export type VideoCodec = "H264" | "HEVC_H265" | "VP8" | "VP9" | "AV1";
export type RateControl = "CBR" | "VBR" | "ABR";
export type ProtocolType = "webrtc_p2p" | "rtsp" | "rtmp" | "srt";

export interface StreamConnectionConfig {
  id: string;
  name: string;
  protocol: ProtocolType;
  enabled: boolean;
  // Common
  host: string;
  port: number;
  path: string;
  streamKey?: string;
  // RTSP specific
  rtspTransport?: "tcp" | "udp" | "http";
  rtspMode?: "push" | "pull";
  // RTMP specific
  rtmpChunkSize?: number;
  // SRT specific
  srtMode?: "caller" | "listener" | "rendezvous";
  srtLatencyMs?: number;
  srtPassphrase?: string;
  srtStreamId?: string;
  // WebRTC specific
  roomCode: string;
  // Auth
  username?: string;
  password?: string;
}

export interface BroadcastSettings {
  // Video
  resolution: VideoResolution;
  codec: VideoCodec;
  bitrateKbps: number;
  rateControl: RateControl;
  gopIntervalSec: number;
  aspectRatio: "16:9" | "9:16" | "4:3";
  facingMode: "environment" | "user";
  zoom: number;
  exposureCompensation?: number; // -2 to +2 EV
  torch: boolean;
  gridOverlay: "none" | "ruleOfThirds" | "crosshair" | "golden";
  // Audio
  audioEnabled: boolean;
  sampleRate: 44100 | 48000;
  audioBitrateKbps: number;
  channels: 1 | 2;
  micGain: number; // 0 to 200%
  noiseSuppression: boolean;
  echoCancellation: boolean;
  // Network
  adaptiveBitrate: boolean;
  minBitrateKbps: number;
  maxBitrateKbps: number;
  packetLossProtection: boolean;
  // Recording
  localRecordingEnabled: boolean;
  recordingFormat: "mp4" | "webm";
  // Connections list
  activeConnectionId: string;
  connections: StreamConnectionConfig[];
  // Direct PC IP Connection Config (for APK / Mobile Broadcaster)
  targetPcIp?: string;
  targetPcPort?: number;
  autoConnectOnLaunch?: boolean;
}

export interface StreamStats {
  isLive: boolean;
  isRecording: boolean;
  uptimeSeconds: number;
  recordingSeconds: number;
  currentBitrateKbps: number;
  fps: number;
  droppedFrames: number;
  totalFrames: number;
  rttLatencyMs: number;
  packetLossPercent: number;
  audioPeakDb: number;
  audioRmsDb: number;
  batteryLevel: number;
  isCharging: boolean;
  temperatureStatus: "normal" | "warm" | "hot";
  connectedPeersCount: number;
}

export interface RemoteControlCommand {
  type: "toggle_torch" | "flip_camera" | "set_zoom" | "take_snapshot" | "toggle_recording" | "set_resolution";
  value?: any;
}

export type ConnectionMode = "direct_ip" | "cloud_relay" | "unknown" | "direct" | "relay" | "localhost";
