import React, { useRef, useEffect, useState } from "react";
import { useWebRTCReceiver } from "../hooks/useWebRTCReceiver";
import {
  Laptop,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  Camera,
  Flashlight,
  ZoomIn,
  Sparkles,
  Copy,
  Check,
  Tv,
  Wifi,
  Disc,
  QrCode,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import QRCode from "qrcode";

interface ReceiverViewProps {
  roomCode: string;
  onSwitchToBroadcaster: () => void;
  onOpenWifiGuide: () => void;
  localIp: string;
}

export const ReceiverView: React.FC<ReceiverViewProps> = ({
  roomCode,
  onSwitchToBroadcaster,
  onOpenWifiGuide,
  localIp,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRecordingOnPc, setIsRecordingOnPc] = useState<boolean>(false);
  const [customPcIp, setCustomPcIp] = useState<string>(localIp || "192.168.1.100");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const pcRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (localIp && localIp !== "127.0.0.1") {
      setCustomPcIp(localIp);
    }
  }, [localIp]);

  const effectiveIp = customPcIp || localIp || "192.168.1.100";
  const mobileApkUrl = `http://${effectiveIp}:3000/?room=${roomCode}&pcIp=${effectiveIp}`;

  useEffect(() => {
    QRCode.toDataURL(mobileApkUrl, { width: 280, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then((url) => setQrDataUrl(url))
      .catch(console.warn);
  }, [mobileApkUrl]);

  const {
    remoteStream,
    isConnected,
    latencyMs,
    fps,
    bitrateKbps,
    resolution,
    isAudioMuted,
    setIsAudioMuted,
    volume,
    setVolume,
    statusMessage,
    sendRemoteCommand,
  } = useWebRTCReceiver(roomCode);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Check URL params for clean mode (OBS Browser Source)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("clean") === "true") {
      setIsCleanMode(true);
    }
  }, []);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // PC Local Recording of the incoming stream
  const startPcRecording = () => {
    if (!remoteStream) return;
    try {
      const recorder = new MediaRecorder(remoteStream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pc-studio-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };
      recorder.start(1000);
      pcRecorderRef.current = recorder;
      setIsRecordingOnPc(true);
    } catch (e) {
      console.warn("PC Recording error:", e);
    }
  };

  const stopPcRecording = () => {
    if (pcRecorderRef.current && pcRecorderRef.current.state !== "inactive") {
      pcRecorderRef.current.stop();
    }
    setIsRecordingOnPc(false);
  };

  // PC Snapshot of incoming video
  const takePcSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `pc-snapshot-${Date.now()}.png`;
      a.click();
    }
  };

  const obsBrowserUrl = `${window.location.origin}/?mode=receiver&room=${roomCode}&clean=true`;

  if (isCleanMode) {
    // Pure Clean View for OBS Studio Browser Source
    return (
      <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isAudioMuted}
          className="w-full h-full object-contain"
        />
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white font-mono text-sm">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>{statusMessage}</p>
              <p className="text-xs text-neutral-500">Sala: {roomCode}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans">
      {/* PC Receiver Header */}
      <header className="flex items-center justify-between px-6 h-16 border-b border-neutral-800 bg-black sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="p-2 border border-neutral-800 bg-neutral-900 text-white">
            <Laptop className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xs uppercase font-black tracking-widest flex items-center space-x-2">
              <span>SN-trean Monitor &amp; Receptor OBS Studio</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 border font-bold uppercase ${
                  isConnected
                    ? "bg-green-950/80 border-green-700 text-green-400"
                    : "bg-neutral-900 border-neutral-800 text-neutral-400"
                }`}
              >
                {isConnected ? "SINAL ATIVO" : "AGUARDANDO APK"}
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400 font-mono">
              IP DO PC: <span className="text-green-400 font-bold">{effectiveIp}:3000</span> • SALA: <span className="text-white font-bold">{roomCode}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-green-400 text-xs uppercase font-bold tracking-wider border border-green-500/40 flex items-center space-x-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code APK</span>
          </button>
          <button
            onClick={onOpenWifiGuide}
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs uppercase font-bold tracking-wider border border-neutral-800 flex items-center space-x-1.5 transition-colors"
          >
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span>Guia Sem Internet</span>
          </button>
          <button
            onClick={onSwitchToBroadcaster}
            className="px-3 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-md"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Modo Transmissor</span>
          </button>
        </div>
      </header>

      {/* Prominent PC IP Banner */}
      <div className="bg-black border-b border-neutral-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-neutral-400 block">
                IP DE CONEXÃO DIRETA PARA O APK / CELULAR:
              </span>
              <div className="flex items-center space-x-2 mt-0.5">
                <input
                  type="text"
                  value={customPcIp}
                  onChange={(e) => setCustomPcIp(e.target.value)}
                  placeholder="192.168.1.X"
                  className="bg-neutral-900 border border-neutral-700 px-3 py-1 text-xs font-mono font-bold text-green-400 w-44 outline-none focus:border-green-400"
                />
                <span className="text-xs font-mono text-neutral-400">:3000</span>
                <button
                  onClick={() => copyText(effectiveIp, "pcIpOnly")}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-mono font-bold uppercase transition-colors"
                >
                  {copiedKey === "pcIpOnly" ? "COPIADO" : "COPIAR IP"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-neutral-400">
            <span>Link do Transmissor:</span>
            <span className="text-green-400 font-bold bg-neutral-900 px-2 py-1 border border-neutral-800 truncate max-w-xs md:max-w-md">
              {mobileApkUrl}
            </span>
            <button
              onClick={() => copyText(mobileApkUrl, "fullApkUrl")}
              className="px-3 py-1 bg-white hover:bg-neutral-200 text-black font-black uppercase text-[10px] transition-colors shrink-0"
            >
              {copiedKey === "fullApkUrl" ? "COPIADO" : "COPIAR LINK"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Live Video Feed Display (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="relative aspect-video bg-black border border-neutral-800 overflow-hidden shadow-2xl flex items-center justify-center group">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isAudioMuted}
              className="w-full h-full object-contain"
            />

            {!isConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-neutral-300 p-6 text-center space-y-3">
                <div className="w-10 h-10 border-2 border-green-400 border-t-transparent animate-spin" />
                <p className="text-xs uppercase font-black tracking-widest text-neutral-200">{statusMessage}</p>
                <p className="text-xs text-neutral-400 max-w-md font-mono">
                  No APK do celular, configure o IP <span className="text-green-400 font-bold">{effectiveIp}:3000</span> e toque em <strong>"INICIAR TRANSMISSÃO"</strong> na sala <span className="text-green-400 font-bold">{roomCode}</span>.
                </p>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="mt-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-green-500/50 text-green-400 text-xs font-bold uppercase tracking-wider flex items-center space-x-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Ver QR Code para Escanear no Celular</span>
                </button>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Audio Monitor */}
              <div className="flex items-center space-x-2 bg-neutral-950 border border-neutral-800 px-3 py-1.5">
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="text-neutral-300 hover:text-white"
                  title="Mutar/Desmutar áudio do celular no PC"
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) videoRef.current.volume = v;
                  }}
                  className="w-20 accent-white h-1 bg-neutral-800 cursor-pointer"
                />
              </div>

              {/* Action Buttons: PC REC, Snapshot, Fullscreen */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={isRecordingOnPc ? stopPcRecording : startPcRecording}
                  disabled={!isConnected}
                  className={`px-3 py-1.5 border text-xs uppercase font-bold tracking-wider flex items-center space-x-1.5 transition-colors ${
                    isRecordingOnPc
                      ? "bg-red-600 text-white border-red-500 animate-pulse font-black"
                      : "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200"
                  }`}
                  title="Gravar vídeo no PC"
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>{isRecordingOnPc ? "GRAVANDO NO PC..." : "GRAVAR NO PC"}</span>
                </button>

                <button
                  onClick={takePcSnapshot}
                  disabled={!isConnected}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 transition-colors"
                  title="Capturar Foto"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 transition-colors"
                  title="Tela Cheia"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Diagnostic Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Latência (RTT)</span>
              <div className="text-2xl font-black font-display text-green-400 my-0.5">
                {isConnected ? `${latencyMs} MS` : "--"}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">Ultra-baixa latência LAN</span>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Taxa de Quadros</span>
              <div className="text-2xl font-black font-display text-white my-0.5">
                {isConnected ? `${fps} FPS` : "--"}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">Fluidez contínua</span>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Bitrate Recebido</span>
              <div className="text-2xl font-black font-display text-blue-400 my-0.5">
                {isConnected ? `${bitrateKbps} K` : "--"}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">H.264 / HEVC Stream</span>
            </div>

            <div className="p-4 bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">Resolução Real</span>
              <div className="text-2xl font-black font-display text-white my-0.5">
                {resolution.width > 0 ? `${resolution.width}X${resolution.height}` : "1080P"}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">Aspect 16:9 Nativo</span>
            </div>
          </div>
        </div>

        {/* Right: Remote Director Controls & OBS Integration Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Director Remote Controls */}
          <div className="p-5 bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xs uppercase font-black tracking-widest text-white flex items-center space-x-2">
                <Radio className="w-4 h-4 text-green-400" />
                <span>Controle Remoto do Diretor</span>
              </h3>
              <span className="text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-900 text-green-400 font-mono font-bold uppercase">
                TELEMETRIA
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Controle a câmera e lentes do smartphone diretamente deste computador pela rede Wi-Fi:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendRemoteCommand({ type: "flip_camera" })}
                disabled={!isConnected}
                className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs uppercase font-bold tracking-wider text-neutral-200 flex flex-col items-center space-y-1.5 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-green-400" />
                <span>Trocar Câmera</span>
              </button>

              <button
                onClick={() => sendRemoteCommand({ type: "toggle_torch" })}
                disabled={!isConnected}
                className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs uppercase font-bold tracking-wider text-neutral-200 flex flex-col items-center space-y-1.5 transition-colors disabled:opacity-50"
              >
                <Flashlight className="w-4 h-4 text-amber-400" />
                <span>Lanterna / Flash</span>
              </button>

              <button
                onClick={() => sendRemoteCommand({ type: "set_zoom", value: 2.0 })}
                disabled={!isConnected}
                className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs uppercase font-bold tracking-wider text-neutral-200 flex flex-col items-center space-y-1.5 transition-colors disabled:opacity-50"
              >
                <ZoomIn className="w-4 h-4 text-blue-400" />
                <span>Zoom 2.0X</span>
              </button>

              <button
                onClick={() => sendRemoteCommand({ type: "take_snapshot" })}
                disabled={!isConnected}
                className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs uppercase font-bold tracking-wider text-neutral-200 flex flex-col items-center space-y-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Foto no Celular</span>
              </button>
            </div>
          </div>

          {/* OBS Studio Integration Panel */}
          <div className="p-5 bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xs uppercase font-black tracking-widest text-white flex items-center space-x-2">
                <Tv className="w-4 h-4 text-green-400" />
                <span>Fonte do OBS Studio</span>
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Adicione a URL abaixo como uma <strong>Fonte de Navegador (Browser Source)</strong> no OBS para capturar o vídeo limpo sem botões na transmissão:
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={obsBrowserUrl}
                  className="flex-1 bg-black border border-neutral-800 px-3 py-2 text-xs font-mono text-green-400 select-all"
                />
                <button
                  onClick={() => copyText(obsBrowserUrl, "obsUrl")}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-colors shrink-0"
                >
                  {copiedKey === "obsUrl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "obsUrl" ? "COPIADO" : "COPIAR"}</span>
                </button>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400 space-y-1">
                <div><strong>LARGURA:</strong> 1920 &nbsp; <strong>ALTURA:</strong> 1080</div>
                <div><strong>FPS:</strong> 60 OU 30</div>
                <div><strong>ÁUDIO:</strong> Marque "Controlar áudio via OBS"</div>
              </div>
            </div>
          </div>

          {/* Windows Firewall Helper */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-300 text-xs font-bold uppercase">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Dica: Liberar Porta 3000 no Windows</span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              Se o APK não conectar, execute no PowerShell (Admin):
            </p>
            <button
              onClick={() => copyText(`netsh advfirewall firewall add rule name="SN-trean 3000" dir=in action=allow protocol=TCP localport=3000`, "firewallRule")}
              className="w-full text-left p-2 bg-black border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono text-green-400 truncate flex items-center justify-between"
            >
              <span className="truncate">netsh advfirewall firewall add rule name="SN-trean 3000"...</span>
              <span className="ml-2 text-white font-bold shrink-0">{copiedKey === "firewallRule" ? "COPIADO" : "COPIAR"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal for Phone Camera / APK Scan */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-950 border border-neutral-800 p-6 max-w-sm w-full text-center space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-xs uppercase font-black tracking-widest text-white flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-green-400" />
                <span>Escanear no Celular / APK</span>
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 font-mono">
              Aponte a câmera do celular para conectar diretamente com o IP <strong className="text-green-400">{effectiveIp}:3000</strong>:
            </p>

            {qrDataUrl && (
              <div className="p-3 bg-white inline-block mx-auto border border-neutral-800 shadow-xl">
                <img src={qrDataUrl} alt="QR Code Link" className="w-52 h-52 object-contain" />
              </div>
            )}

            <div className="bg-neutral-900 p-2.5 border border-neutral-800 text-[10px] font-mono text-green-400 break-all font-bold">
              {mobileApkUrl}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-white text-black text-xs font-black uppercase tracking-wide hover:bg-neutral-200 transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

