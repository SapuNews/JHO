import React, { useRef, useEffect, useState } from "react";
import {
  BroadcastSettings,
  StreamStats,
  RESOLUTION_PRESETS,
  VideoResolution,
} from "../types";
import { AudioVuMeter } from "./AudioVuMeter";
import {
  Radio,
  Camera,
  Flashlight,
  Grid,
  Maximize2,
  Minimize2,
  Settings,
  Mic,
  MicOff,
  Disc,
  QrCode,
  Wifi,
  Battery,
  BatteryCharging,
  SlidersHorizontal,
  Sparkles,
  CameraOff,
  Download,
  Laptop,
  AlertTriangle,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  Focus,
  Volume2,
  Layers,
  ArrowRightLeft,
} from "lucide-react";
import QRCode from "qrcode";

interface BroadcastViewProps {
  stream: MediaStream | null;
  hasPermission: boolean | null;
  error: string | null;
  settings: BroadcastSettings;
  onUpdateSettings: (newSettings: BroadcastSettings) => void;
  stats: StreamStats;
  isLive: boolean;
  liveDuration: number;
  signalingState?: "idle" | "connecting" | "connected" | "disconnected" | "error";
  signalingError?: string | null;
  resolvedWsUrl?: string;
  onStartBroadcast: () => void;
  onStopBroadcast: () => void;
  isRecordingLocal: boolean;
  recordingDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFlipCamera: () => void;
  onToggleTorch: (val: boolean) => void;
  onSetZoom: (zoom: number) => void;
  onTakeSnapshot: () => void;
  audioLevel: { peakDb: number; rmsDb: number };
  onOpenSettings: () => void;
  onOpenWifiGuide: () => void;
  onOpenApkExport: () => void;
  onOpenPcConnection: () => void;
  localIp: string;
}

export const BroadcastView: React.FC<BroadcastViewProps> = ({
  stream,
  hasPermission,
  error,
  settings,
  onUpdateSettings,
  stats,
  isLive,
  liveDuration,
  signalingState = "idle",
  signalingError,
  resolvedWsUrl,
  onStartBroadcast,
  onStopBroadcast,
  isRecordingLocal,
  recordingDuration,
  onStartRecording,
  onStopRecording,
  onFlipCamera,
  onToggleTorch,
  onSetZoom,
  onTakeSnapshot,
  audioLevel,
  onOpenSettings,
  onOpenWifiGuide,
  onOpenApkExport,
  onOpenPcConnection,
  localIp,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [isShutterFlashing, setIsShutterFlashing] = useState<boolean>(false);
  const [showZoomPresets, setShowZoomPresets] = useState<boolean>(false);

  // Bind media stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Generate QR Code for instant PC receiver pairing
  const activeConn = settings.connections.find((c) => c.id === settings.activeConnectionId) || settings.connections[0];
  const roomCode = activeConn?.roomCode || "larix-studio-1";
  const targetIp = settings.targetPcIp || activeConn?.host || localIp || "192.168.1.100";
  const targetPort = settings.targetPcPort || activeConn?.port || 3000;
  const receiverUrl = `http://${targetIp}:${targetPort}/?mode=receiver&room=${roomCode}`;

  useEffect(() => {
    QRCode.toDataURL(receiverUrl, { width: 280, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => setQrDataUrl(url))
      .catch(console.warn);
  }, [receiverUrl]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleZoomChange = (val: number) => {
    onUpdateSettings({ ...settings, zoom: val });
    onSetZoom(val);
  };

  const handleTorchToggle = () => {
    const newVal = !settings.torch;
    onUpdateSettings({ ...settings, torch: newVal });
    onToggleTorch(newVal);
  };

  const cycleGrid = () => {
    const modes: ("none" | "ruleOfThirds" | "crosshair" | "golden")[] = ["none", "ruleOfThirds", "crosshair", "golden"];
    const currentIdx = modes.indexOf(settings.gridOverlay);
    const nextIdx = (currentIdx + 1) % modes.length;
    onUpdateSettings({ ...settings, gridOverlay: modes[nextIdx] });
  };

  const handleViewfinderClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If drawer is open, close it
    if (isDrawerOpen) {
      setIsDrawerOpen(false);
      return;
    }
    // Show focus reticle at tap location
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    setTimeout(() => {
      setFocusPoint(null);
    }, 1800);
  };

  const handleSnapshotClick = () => {
    setIsShutterFlashing(true);
    setTimeout(() => setIsShutterFlashing(false), 200);
    onTakeSnapshot();
  };

  return (
    <div className="relative w-full h-full min-h-[100vh] bg-black select-none overflow-hidden flex flex-col justify-between font-sans">
      {/* 1. Camera Viewport & Framing Guides (Layer 0 - Unobstructed Fullscreen) */}
      <div
        onClick={handleViewfinderClick}
        className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden cursor-crosshair"
      >
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-200 ${
              settings.facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
            style={{
              aspectRatio:
                settings.aspectRatio === "16:9"
                  ? "16/9"
                  : settings.aspectRatio === "4:3"
                  ? "4/3"
                  : "9/16",
            }}
          />
        ) : (
          <div className="text-center p-6 text-neutral-500 flex flex-col items-center gap-3">
            <CameraOff className="w-12 h-12 text-neutral-600 animate-pulse" />
            <p className="text-sm font-medium text-neutral-400">
              {error || "Iniciando câmera e microfone de alta fidelidade..."}
            </p>
          </div>
        )}

        {/* Shutter Flash Animation */}
        {isShutterFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-fade-out" />
        )}

        {/* Tap-to-Focus Reticle */}
        {focusPoint && (
          <div
            className="absolute z-20 pointer-events-none transition-all transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: focusPoint.x, top: focusPoint.y }}
          >
            <div className="w-16 h-16 border border-amber-400/80 rounded-lg flex items-center justify-center animate-ping opacity-60"></div>
            <div className="w-16 h-16 border-2 border-amber-400 rounded-lg absolute inset-0 flex items-center justify-center shadow-lg shadow-amber-400/20">
              <div className="w-1 h-1 bg-amber-400 rounded-full" />
            </div>
          </div>
        )}

        {/* Cinematic Framing Guides */}
        {settings.gridOverlay === "ruleOfThirds" && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
            <div className="border-r border-b border-white/70"></div>
            <div className="border-r border-b border-white/70"></div>
            <div className="border-b border-white/70"></div>
            <div className="border-r border-b border-white/70"></div>
            <div className="border-r border-b border-white/70"></div>
            <div className="border-b border-white/70"></div>
            <div className="border-r border-b border-white/70"></div>
            <div className="border-r border-b border-white/70"></div>
            <div></div>
          </div>
        )}

        {settings.gridOverlay === "crosshair" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
            <div className="w-16 h-0.5 bg-white/90"></div>
            <div className="h-16 w-0.5 bg-white/90 absolute"></div>
            <div className="w-10 h-10 rounded-full border border-white/80 absolute"></div>
          </div>
        )}

        {settings.gridOverlay === "golden" && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-[38.2%_23.6%_38.2%] grid-rows-[38.2%_23.6%_38.2%] opacity-25">
            <div className="border-r border-b border-amber-300/80"></div>
            <div className="border-r border-b border-amber-300/80"></div>
            <div className="border-b border-amber-300/80"></div>
            <div className="border-r border-b border-amber-300/80"></div>
            <div className="border-r border-b border-amber-300/80"></div>
            <div className="border-b border-amber-300/80"></div>
            <div className="border-r border-b border-amber-300/80"></div>
            <div className="border-r border-b border-amber-300/80"></div>
            <div></div>
          </div>
        )}
      </div>

      {/* 2. Top Floating Frosted Status Strip (Layer 10) */}
      {!isCleanMode ? (
        <header className="relative z-20 mx-3 mt-3 sm:mx-6 sm:mt-4 p-2 sm:p-2.5 backdrop-blur-xl bg-black/45 border border-white/15 rounded-2xl text-white shadow-2xl flex items-center justify-between transition-all duration-300">
          {/* Left: Live Indicator & PC Direct IP */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider ${
                isLive
                  ? "bg-red-500/20 border border-red-500/60 text-red-400 animate-pulse"
                  : "bg-neutral-800/70 border border-white/10 text-neutral-300"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500" : "bg-neutral-500"}`} />
              <span>{isLive ? "LIVE" : "STANDBY"}</span>
              {isLive && <span className="text-white font-bold ml-1">{formatTime(liveDuration)}</span>}
            </div>

            {/* PC IP Target Pill */}
            <button
              onClick={onOpenPcConnection}
              className="px-2.5 py-1 bg-neutral-900/80 hover:bg-neutral-800 border border-emerald-500/40 hover:border-emerald-400 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full flex items-center space-x-1.5 transition-all shadow-sm"
              title="Configurar IP do Computador"
            >
              <Laptop className="w-3 h-3" />
              <span className="hidden sm:inline">PC:</span>
              <span className="font-semibold">{targetIp}:{targetPort}</span>
            </button>
          </div>

          {/* Center: Sleek Telemetry (Resolution, Bitrate, Micro VU Meter) */}
          <div className="hidden md:flex items-center space-x-2 text-[10px] font-mono text-neutral-300">
            <div className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-full flex items-center space-x-1">
              <span className="text-neutral-500 uppercase">RES</span>
              <span className="font-bold text-white">{settings.resolution.toUpperCase()}</span>
            </div>

            <div className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-full flex items-center space-x-1">
              <span className="text-neutral-500 uppercase">FPS</span>
              <span className={`font-bold ${stats.fps > 25 ? "text-emerald-400" : "text-amber-400"}`}>
                {isLive ? stats.fps : (settings.resolution.includes("60") ? 60 : 30)}
              </span>
            </div>

            <div className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-full flex items-center space-x-1">
              <span className="text-neutral-500 uppercase">BIT</span>
              <span className="font-bold text-emerald-400">{settings.bitrateKbps}K</span>
            </div>

            {/* Compact Horizontal VU Meter */}
            <div className="px-2 py-0.5 bg-black/40 border border-white/10 rounded-full flex items-center space-x-1.5">
              <span className="text-neutral-500 uppercase text-[9px]">MIC</span>
              <AudioVuMeter peakDb={audioLevel.peakDb} rmsDb={audioLevel.rmsDb} compact={true} />
            </div>
          </div>

          {/* Right: Clean View Toggle, Battery, Drawer Opener */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Clean View Toggle */}
            <button
              onClick={() => setIsCleanMode(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 bg-black/40 hover:bg-neutral-800 border border-white/10 hover:border-white/30 text-neutral-300 text-[10px] font-mono rounded-full flex items-center space-x-1 transition-all"
              title="Modo Livre / Limpar Tela"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-300" />
              <span className="hidden sm:inline">Visão Limpa</span>
            </button>

            {/* QR Link Pill */}
            <button
              onClick={() => setShowQrModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1 bg-black/40 hover:bg-neutral-800 border border-white/10 text-neutral-300 text-[10px] font-mono rounded-full flex items-center space-x-1 transition-all"
              title="Ver Link do Receptor PC"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">QR PC</span>
            </button>

            {/* Battery Indicator */}
            <div className="px-2 py-1 bg-black/40 border border-white/10 rounded-full text-[10px] font-mono flex items-center space-x-1">
              {stats.isCharging ? (
                <BatteryCharging className="w-3 h-3 text-emerald-400" />
              ) : (
                <Battery className="w-3 h-3 text-neutral-400" />
              )}
              <span className="font-bold text-neutral-200">{stats.batteryLevel}%</span>
            </div>

            {/* Quick Drawer Trigger Button */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className={`p-2 rounded-full border transition-all ${
                isDrawerOpen
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-neutral-900/80 hover:bg-neutral-800 border-white/15 text-white"
              }`}
              title="Ferramentas e Ajustes"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      ) : (
        /* Minimalist Clean View floating bar */
        <div className="relative z-20 mx-4 mt-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center space-x-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 text-white shadow-2xl">
            <div className={`w-2 h-2 rounded-full ${isLive ? "bg-red-500 animate-ping" : "bg-neutral-400"}`} />
            <span className="text-xs font-mono font-bold">{isLive ? `LIVE ${formatTime(liveDuration)}` : "STANDBY"}</span>
          </div>

          <button
            onClick={() => setIsCleanMode(false)}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-xl border border-white/30 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-2xl active:scale-95"
          >
            <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restaurar HUD</span>
          </button>
        </div>
      )}

      {/* Signaling Warning Banner if any */}
      {signalingError && !isCleanMode && (
        <div className="relative z-30 mx-3 sm:mx-6 mt-2 p-2.5 bg-red-950/80 backdrop-blur-xl border border-red-500/60 rounded-xl text-white flex items-center justify-between shadow-2xl animate-fade-in">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-red-200">{signalingError}</span>
          </div>
          <button
            onClick={onOpenPcConnection}
            className="ml-3 px-3 py-1 bg-white text-black font-mono font-bold text-[10px] uppercase rounded-lg hover:bg-neutral-200 shrink-0 transition-colors"
          >
            Ajustar IP
          </button>
        </div>
      )}

      {/* 3. Floating Quick Lens / Zoom Pills (Right Center - Non-intrusive) */}
      {!isCleanMode && (
        <div className="relative z-10 flex-1 flex items-center justify-end px-3 sm:px-6 pointer-events-none">
          {/* Subtle Zoom Preset Ring */}
          <div className="pointer-events-auto flex flex-col items-center space-y-2 backdrop-blur-xl bg-black/40 border border-white/10 p-1.5 rounded-full shadow-2xl">
            <button
              onClick={() => handleZoomChange(1.0)}
              className={`w-9 h-9 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-all ${
                settings.zoom === 1.0
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
            >
              1X
            </button>
            <button
              onClick={() => handleZoomChange(2.0)}
              className={`w-9 h-9 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-all ${
                settings.zoom === 2.0
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
            >
              2X
            </button>
            <button
              onClick={() => handleZoomChange(3.0)}
              className={`w-9 h-9 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-all ${
                settings.zoom === 3.0
                  ? "bg-white text-black shadow-md"
                  : "text-neutral-300 hover:text-white hover:bg-white/10"
              }`}
            >
              3X
            </button>
            <button
              onClick={() => setShowZoomPresets(!showZoomPresets)}
              className="w-9 h-9 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-all border border-white/10"
              title="Ajuste Fino de Zoom"
            >
              <Focus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fine Zoom Slider Popout */}
          {showZoomPresets && (
            <div className="pointer-events-auto mr-3 p-3 backdrop-blur-2xl bg-black/75 border border-white/15 rounded-2xl flex flex-col items-center space-y-2 shadow-2xl animate-fade-in">
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                {settings.zoom.toFixed(1)}X ZOOM
              </span>
              <input
                type="range"
                min={1}
                max={6}
                step={0.1}
                value={settings.zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-24 h-1 accent-emerald-400 bg-neutral-800 cursor-pointer -rotate-90 my-8"
              />
              <button
                onClick={() => setShowZoomPresets(false)}
                className="text-[10px] font-mono text-neutral-400 hover:text-white uppercase"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Sliding Lateral Tools Drawer ("Guardado Atrás para Deixar Livre") */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end animate-fade-in">
          {/* Backdrop Click-to-Close */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer Content Panel */}
          <div className="relative z-50 w-80 max-w-[85vw] h-full bg-neutral-950/90 backdrop-blur-2xl border-l border-white/15 p-5 flex flex-col justify-between overflow-y-auto text-white shadow-2xl animate-slide-left">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono uppercase font-bold tracking-wider">
                    Controles da Câmera
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Lens & Hardware Toggles Grid */}
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block mb-2 font-bold">
                  Óptica e Hardware
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {/* Flip Camera */}
                  <button
                    onClick={onFlipCamera}
                    className="p-3 bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all text-neutral-200"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-mono font-bold">Trocar Câmera</span>
                  </button>

                  {/* Flashlight / Torch */}
                  <button
                    onClick={handleTorchToggle}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all ${
                      settings.torch
                        ? "bg-amber-400 text-black border-amber-300 font-bold shadow-lg shadow-amber-400/20"
                        : "bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-200"
                    }`}
                  >
                    <Flashlight className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold">
                      {settings.torch ? "Lanterna Ligada" : "Lanterna"}
                    </span>
                  </button>

                  {/* Framing Grid */}
                  <button
                    onClick={cycleGrid}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all ${
                      settings.gridOverlay !== "none"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-200"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold capitalize">
                      {settings.gridOverlay === "none" ? "Grade: Off" : settings.gridOverlay}
                    </span>
                  </button>

                  {/* Photo Snapshot */}
                  <button
                    onClick={handleSnapshotClick}
                    className="p-3 bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 rounded-xl flex flex-col items-center justify-center space-y-1.5 transition-all text-neutral-200"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-mono font-bold">Foto Snapshot</span>
                  </button>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 font-bold">
                    Áudio & Microfone
                  </span>
                  <button
                    onClick={() => onUpdateSettings({ ...settings, audioEnabled: !settings.audioEnabled })}
                    className={`p-1.5 rounded-lg border text-xs font-mono font-bold flex items-center space-x-1 transition-all ${
                      settings.audioEnabled
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-red-500/20 border-red-500 text-red-400"
                    }`}
                  >
                    {settings.audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    <span>{settings.audioEnabled ? "Ativo" : "Mudo"}</span>
                  </button>
                </div>

                <AudioVuMeter peakDb={audioLevel.peakDb} rmsDb={audioLevel.rmsDb} vertical={false} />
              </div>

              {/* Bitrate Slider */}
              <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-400">Taxa de Bits (Bitrate):</span>
                  <span className="font-bold text-emerald-400">{settings.bitrateKbps} KBPS</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={20000}
                  step={500}
                  value={settings.bitrateKbps}
                  onChange={(e) => onUpdateSettings({ ...settings, bitrateKbps: Number(e.target.value) })}
                  className="w-full accent-emerald-400 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Shortcuts to Direct PC IP / Wi-Fi Guide / APK Export */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenPcConnection();
                  }}
                  className="w-full p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-400 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Laptop className="w-4 h-4" />
                    <span>IP do Computador: {targetIp}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenWifiGuide();
                  }}
                  className="w-full p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono text-neutral-300 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span>Guia Wi-Fi Sem Internet</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenApkExport();
                  }}
                  className="w-full p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono text-neutral-300 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Exportar APK Android</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Drawer Footer: Advanced Settings & Fullscreen */}
            <div className="pt-4 border-t border-white/10 flex items-center space-x-2">
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenSettings();
                }}
                className="flex-1 py-2.5 bg-white text-black font-mono font-bold text-xs uppercase rounded-xl flex items-center justify-center space-x-1.5 hover:bg-neutral-200 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Mais Configurações</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2.5 bg-neutral-900 border border-white/10 rounded-xl text-neutral-200 hover:text-white"
                title="Tela Cheia"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bottom Cinematic Command Dock (Layer 10 - Floating Frosted Glass) */}
      {!isCleanMode && (
        <footer className="relative z-20 mx-3 mb-3 sm:mx-6 sm:mb-4 px-4 py-3 backdrop-blur-xl bg-black/45 border border-white/15 rounded-2xl text-white shadow-2xl flex items-center justify-between transition-all duration-300">
          {/* Left: REC LOCAL Trigger */}
          <div className="flex items-center space-x-3">
            <button
              onClick={isRecordingLocal ? onStopRecording : onStartRecording}
              className={`px-3 sm:px-4 py-2 border font-mono text-xs font-bold uppercase tracking-wider rounded-xl flex items-center space-x-2 transition-all shadow-md active:scale-95 ${
                isRecordingLocal
                  ? "bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-rose-900/50"
                  : "bg-neutral-900/80 hover:bg-neutral-800 border-white/10 text-neutral-200"
              }`}
            >
              <Disc className={`w-3.5 h-3.5 ${isRecordingLocal ? "text-rose-500" : "text-neutral-400"}`} />
              <span className="hidden sm:inline">{isRecordingLocal ? `REC ${formatTime(recordingDuration)}` : "REC LOCAL"}</span>
              <span className="sm:hidden">{isRecordingLocal ? formatTime(recordingDuration) : "REC"}</span>
            </button>
          </div>

          {/* Center: Tactile Master Broadcast Shutter Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={isLive ? onStopBroadcast : onStartBroadcast}
              className={`relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full transition-all duration-300 active:scale-90 shadow-2xl ${
                isLive
                  ? "bg-red-600 shadow-red-600/50 ring-4 ring-red-500/40"
                  : "bg-neutral-900 border-2 border-white/40 hover:border-white shadow-black/80 hover:scale-105"
              }`}
              title={isLive ? "Parar Transmissão" : "Iniciar Transmissão"}
            >
              <div
                className={`transition-all duration-300 ${
                  isLive
                    ? "w-6 h-6 bg-white rounded-md shadow-inner"
                    : "w-6 h-6 rounded-full bg-red-500 shadow-lg shadow-red-500/50"
                }`}
              />
            </button>
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold mt-1 text-neutral-400">
              {isLive ? "PARAR LIVE" : "TRANSMITIR"}
            </span>
          </div>

          {/* Right: Quick Resolution Picker & Drawer Opener */}
          <div className="flex items-center space-x-2">
            <select
              value={settings.resolution}
              onChange={(e) => {
                const res = e.target.value as VideoResolution;
                const preset = RESOLUTION_PRESETS[res];
                onUpdateSettings({
                  ...settings,
                  resolution: res,
                  bitrateKbps: preset ? preset.recommendedBitrate : settings.bitrateKbps,
                });
              }}
              className="bg-neutral-900/90 border border-white/15 px-3 py-2 text-xs font-mono text-white font-bold uppercase rounded-xl focus:outline-none cursor-pointer tracking-wider hover:border-white/30 transition-colors"
            >
              <option value="4k">4K UHD</option>
              <option value="1080p60">1080P 60FPS</option>
              <option value="1080p30">1080P 30FPS</option>
              <option value="720p60">720P 60FPS</option>
              <option value="720p30">720P 30FPS</option>
            </select>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 rounded-xl text-neutral-300 hover:text-white transition-colors"
              title="Abrir Controles"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </footer>
      )}

      {/* 6. QR Code Pairing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-950/95 border border-white/15 p-6 max-w-sm w-full text-center space-y-4 rounded-2xl shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-neutral-200 flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Link do Receptor no PC</span>
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 font-mono">
              Abra no navegador do computador ou no OBS Studio:
            </p>

            {qrDataUrl && (
              <div className="p-3 bg-white inline-block mx-auto rounded-xl border border-neutral-800 shadow-xl">
                <img src={qrDataUrl} alt="QR Code Receiver" className="w-44 h-44 object-contain" />
              </div>
            )}

            <div className="bg-neutral-900 p-2.5 rounded-xl border border-white/10 text-[10px] font-mono text-emerald-400 break-all font-bold">
              {receiverUrl}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(receiverUrl);
                  alert("Link copiado com sucesso!");
                }}
                className="flex-1 py-2.5 border border-white/15 text-neutral-300 hover:text-white hover:border-white/30 text-xs font-mono font-bold uppercase rounded-xl transition-colors"
              >
                Copiar Link
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 bg-white text-black text-xs font-mono font-bold uppercase rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
