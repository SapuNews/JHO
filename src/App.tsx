import React, { useState, useEffect, useCallback } from "react";
import { BroadcastSettings, RemoteControlCommand } from "./types";
import { useCameraStream } from "./hooks/useCameraStream";
import { useWebRTCBroadcaster } from "./hooks/useWebRTCBroadcaster";
import { BroadcastView } from "./components/BroadcastView";
import { ReceiverView } from "./components/ReceiverView";
import { SettingsModal } from "./components/SettingsModal";
import { WifiGuideModal } from "./components/WifiGuideModal";
import { ApkExportModal } from "./components/ApkExportModal";
import { PcConnectionModal } from "./components/PcConnectionModal";

const STORAGE_KEY = "larix_studio_settings_v1";

const DEFAULT_SETTINGS: BroadcastSettings = {
  resolution: "1080p30",
  codec: "H264",
  bitrateKbps: 4500,
  rateControl: "CBR",
  gopIntervalSec: 1,
  aspectRatio: "16:9",
  facingMode: "environment",
  zoom: 1.0,
  torch: false,
  gridOverlay: "none",
  audioEnabled: true,
  sampleRate: 48000,
  audioBitrateKbps: 128,
  channels: 2,
  micGain: 100,
  noiseSuppression: true,
  echoCancellation: true,
  adaptiveBitrate: true,
  minBitrateKbps: 1000,
  maxBitrateKbps: 15000,
  packetLossProtection: true,
  localRecordingEnabled: true,
  recordingFormat: "mp4",
  targetPcIp: "127.0.0.1",
  targetPcPort: 3000,
  autoConnectOnLaunch: false,
  activeConnectionId: "default-p2p",
  connections: [
    {
      id: "default-p2p",
      name: "WebRTC P2P Wi-Fi Direto (Zero Latência)",
      protocol: "webrtc_p2p",
      enabled: true,
      host: "127.0.0.1",
      port: 3000,
      path: "/",
      roomCode: "larix-studio-1",
    },
    {
      id: "default-rtmp",
      name: "OBS Studio RTMP Local",
      protocol: "rtmp",
      enabled: true,
      host: "192.168.1.100",
      port: 1935,
      path: "/live",
      streamKey: "stream-key",
      roomCode: "larix-studio-1",
    },
    {
      id: "default-rtsp",
      name: "RTSP Server Local (MediaMTX)",
      protocol: "rtsp",
      enabled: true,
      host: "192.168.1.100",
      port: 8554,
      path: "/live/stream",
      roomCode: "larix-studio-1",
      rtspTransport: "tcp",
    },
    {
      id: "default-srt",
      name: "SRT Caller OBS Studio",
      protocol: "srt",
      enabled: true,
      host: "192.168.1.100",
      port: 9998,
      path: "",
      roomCode: "larix-studio-1",
      srtMode: "caller",
      srtLatencyMs: 120,
    },
  ],
};

export default function App() {
  // Load settings from localStorage with URL query override
  const [settings, setSettings] = useState<BroadcastSettings>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPcIp = params.get("pcIp");
      const urlRoom = params.get("room");

      const saved = localStorage.getItem(STORAGE_KEY);
      let current = DEFAULT_SETTINGS;
      if (saved) {
        current = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
      if (urlPcIp) {
        current.targetPcIp = urlPcIp;
        current.connections = current.connections.map((c) =>
          c.protocol === "webrtc_p2p" ? { ...c, host: urlPcIp } : c
        );
      }
      if (urlRoom) {
        current.connections = current.connections.map((c) => ({
          ...c,
          roomCode: urlRoom,
        }));
      }
      return current;
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // App mode: "broadcaster" (Phone Camera) or "receiver" (PC / OBS)
  const [mode, setMode] = useState<"broadcaster" | "receiver">(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "receiver" ? "receiver" : "broadcaster";
  });

  const [localIp, setLocalIp] = useState<string>("127.0.0.1");
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isWifiGuideOpen, setIsWifiGuideOpen] = useState<boolean>(false);
  const [isApkExportOpen, setIsApkExportOpen] = useState<boolean>(false);
  const [isPcConnectionOpen, setIsPcConnectionOpen] = useState<boolean>(false);

  // Keep screen awake during broadcast
  useEffect(() => {
    let wakeLock: any = null;
    async function requestWakeLock() {
      if ("wakeLock" in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request("screen");
        } catch (e) {}
      }
    }
    requestWakeLock();

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Fetch local network IP from Express server
  useEffect(() => {
    fetch("/api/network-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.primaryIp) {
          setLocalIp(data.primaryIp);
          // If no custom targetPcIp is saved or it is localhost, suggest localIp
          setSettings((prev) => {
            if (!prev.targetPcIp || prev.targetPcIp === "127.0.0.1" || prev.targetPcIp === "localhost") {
              return { ...prev, targetPcIp: data.primaryIp };
            }
            return prev;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateSettings = useCallback((newSettings: BroadcastSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {}
  }, []);

  // Camera stream hook
  const {
    stream,
    hasPermission,
    error,
    audioLevel,
    toggleTorch,
    setZoomLevel,
    setExposureCompensation,
    flipCamera,
    startRecording,
    stopRecording,
    isRecordingLocal,
    recordingDuration,
    takeSnapshot,
  } = useCameraStream(settings);

  // Handle remote director commands from PC receiver
  const handleRemoteCommand = useCallback((cmd: RemoteControlCommand) => {
    if (cmd.type === "flip_camera") {
      flipCamera();
    } else if (cmd.type === "toggle_torch") {
      toggleTorch(!settings.torch);
      handleUpdateSettings({ ...settings, torch: !settings.torch });
    } else if (cmd.type === "set_zoom" && typeof cmd.value === "number") {
      setZoomLevel(cmd.value);
      handleUpdateSettings({ ...settings, zoom: cmd.value });
    } else if (cmd.type === "take_snapshot") {
      takeSnapshot();
    } else if (cmd.type === "toggle_recording") {
      if (isRecordingLocal) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  }, [flipCamera, toggleTorch, setZoomLevel, takeSnapshot, isRecordingLocal, startRecording, stopRecording, settings, handleUpdateSettings]);

  // WebRTC Broadcaster Hook
  const {
    isLive,
    liveDuration,
    stats,
    signalingState,
    signalingError,
    connectionMode,
    resolvedWsUrl,
    startBroadcast,
    stopBroadcast,
    roomCode,
  } = useWebRTCBroadcaster(stream, settings, handleRemoteCommand);

  return (
    <main className="w-full min-h-screen bg-black text-white">
      {mode === "broadcaster" ? (
        <BroadcastView
          stream={stream}
          hasPermission={hasPermission}
          error={error}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          stats={stats}
          isLive={isLive}
          liveDuration={liveDuration}
          signalingState={signalingState}
          signalingError={signalingError}
          resolvedWsUrl={resolvedWsUrl}
          connectionMode={connectionMode}
          onStartBroadcast={startBroadcast}
          onStopBroadcast={stopBroadcast}
          isRecordingLocal={isRecordingLocal}
          recordingDuration={recordingDuration}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onFlipCamera={flipCamera}
          onToggleTorch={toggleTorch}
          onSetZoom={setZoomLevel}
          onSetExposure={setExposureCompensation}
          onTakeSnapshot={takeSnapshot}
          audioLevel={audioLevel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenWifiGuide={() => setIsWifiGuideOpen(true)}
          onOpenApkExport={() => setIsApkExportOpen(true)}
          onOpenPcConnection={() => setIsPcConnectionOpen(true)}
          localIp={localIp}
        />
      ) : (
        <ReceiverView
          roomCode={roomCode}
          onSwitchToBroadcaster={() => setMode("broadcaster")}
          onOpenWifiGuide={() => setIsWifiGuideOpen(true)}
          localIp={localIp}
        />
      )}

      {/* PC Direct IP Connection Configuration Modal */}
      <PcConnectionModal
        isOpen={isPcConnectionOpen}
        onClose={() => setIsPcConnectionOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
        localIp={localIp}
      />

      {/* Advanced Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleUpdateSettings}
        localIp={localIp}
      />

      {/* Offline Wi-Fi & Hotspot Guide Modal */}
      <WifiGuideModal
        isOpen={isWifiGuideOpen}
        onClose={() => setIsWifiGuideOpen(false)}
        localIp={localIp}
        roomCode={roomCode}
      />

      {/* APK Export & Packaging Modal */}
      <ApkExportModal
        isOpen={isApkExportOpen}
        onClose={() => setIsApkExportOpen(false)}
      />
    </main>
  );
}

