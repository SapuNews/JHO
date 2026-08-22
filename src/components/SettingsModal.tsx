import React, { useState } from "react";
import {
  BroadcastSettings,
  RESOLUTION_PRESETS,
  VideoResolution,
  VideoCodec,
  RateControl,
  ProtocolType,
  StreamConnectionConfig,
} from "../types";
import { Settings, Video, Mic, Network, Disc, Globe, Plus, Trash2, Check, Radio } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BroadcastSettings;
  onSave: (newSettings: BroadcastSettings) => void;
  localIp: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  localIp,
}) => {
  const [localSettings, setLocalSettings] = useState<BroadcastSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<"connections" | "video" | "audio" | "network" | "recording">("connections");
  const [editingConnId, setEditingConnId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateSetting = <K extends keyof BroadcastSettings>(key: K, value: BroadcastSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateConnection = (id: string, updates: Partial<StreamConnectionConfig>) => {
    setLocalSettings((prev) => ({
      ...prev,
      connections: prev.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const handleAddConnection = (protocol: ProtocolType) => {
    const newId = `conn-${Date.now()}`;
    let defaultPort = 1935;
    let defaultPath = "/live";
    let defaultName = "Nova Conexão RTMP";

    if (protocol === "rtsp") {
      defaultPort = 8554;
      defaultPath = "/live/stream";
      defaultName = "RTSP Server Local";
    } else if (protocol === "srt") {
      defaultPort = 9998;
      defaultPath = "";
      defaultName = "SRT Stream OBS";
    } else if (protocol === "webrtc_p2p") {
      defaultPort = 3000;
      defaultPath = "/";
      defaultName = "WebRTC P2P Wi-Fi Direto";
    }

    const newConn: StreamConnectionConfig = {
      id: newId,
      name: defaultName,
      protocol,
      enabled: true,
      host: localIp || "192.168.1.100",
      port: defaultPort,
      path: defaultPath,
      streamKey: "live-stream-key",
      roomCode: `larix-${Math.floor(1000 + Math.random() * 9000)}`,
      rtspTransport: "tcp",
      srtMode: "caller",
      srtLatencyMs: 120,
    };

    setLocalSettings((prev) => ({
      ...prev,
      connections: [...prev.connections, newConn],
      activeConnectionId: newId,
    }));
    setEditingConnId(newId);
  };

  const handleDeleteConnection = (id: string) => {
    if (localSettings.connections.length <= 1) return;
    setLocalSettings((prev) => {
      const filtered = prev.connections.filter((c) => c.id !== id);
      return {
        ...prev,
        connections: filtered,
        activeConnectionId: prev.activeConnectionId === id ? filtered[0].id : prev.activeConnectionId,
      };
    });
  };

  const handleSaveAndClose = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-neutral-950 border border-neutral-800 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black">
          <div className="flex items-center space-x-3">
            <div className="p-2 border border-neutral-800 bg-neutral-900 text-white">
              <Settings className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-black tracking-widest flex items-center space-x-2">
                <span>Configurações Avançadas de Transmissão</span>
                <span className="text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-900 text-green-400 font-mono font-bold">
                  SN-TREAN ENGINE
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Ajuste protocolos de rede, codecs, taxa de quadros e bitrate para ultra-baixa latência
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/50 px-6 space-x-1 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("connections")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "connections"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Conexões (RTMP / RTSP / SRT / P2P)</span>
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "video"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Vídeo &amp; Codificação</span>
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "audio"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Áudio &amp; Microfone</span>
          </button>
          <button
            onClick={() => setActiveTab("network")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "network"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Rede &amp; ABR</span>
          </button>
          <button
            onClick={() => setActiveTab("recording")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "recording"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Gravação Local</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-neutral-300">
          {/* TAB 1: CONNECTIONS */}
          {activeTab === "connections" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs uppercase font-black tracking-widest text-white">Destinos de Transmissão Configurados</h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Selecione qual conexão usar para transmitir para o computador ou servidor
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAddConnection("webrtc_p2p")}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-green-400 border border-green-500/40 text-xs uppercase font-bold tracking-wider flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>+ P2P Wi-Fi</span>
                  </button>
                  <button
                    onClick={() => handleAddConnection("rtmp")}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs uppercase font-bold tracking-wider flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>+ RTMP</span>
                  </button>
                  <button
                    onClick={() => handleAddConnection("rtsp")}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs uppercase font-bold tracking-wider flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>+ RTSP</span>
                  </button>
                  <button
                    onClick={() => handleAddConnection("srt")}
                    className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs uppercase font-bold tracking-wider flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> <span>+ SRT</span>
                  </button>
                </div>
              </div>

              {/* Connections List */}
              <div className="space-y-3">
                {localSettings.connections.map((conn) => {
                  const isActive = localSettings.activeConnectionId === conn.id;
                  const isEditing = editingConnId === conn.id;

                  return (
                    <div
                      key={conn.id}
                      className={`p-4 border transition-all ${
                        isActive
                          ? "bg-black border-green-400"
                          : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleUpdateSetting("activeConnectionId", conn.id)}
                            className={`w-5 h-5 border flex items-center justify-center transition-colors ${
                              isActive
                                ? "border-green-400 bg-green-400 text-black font-bold"
                                : "border-neutral-600 hover:border-neutral-400"
                            }`}
                          >
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white text-sm">{conn.name}</span>
                              <span
                                className={`text-[9px] font-mono px-2 py-0.5 border font-bold uppercase ${
                                  conn.protocol === "webrtc_p2p"
                                    ? "bg-green-950/80 border-green-700 text-green-400"
                                    : conn.protocol === "rtsp"
                                    ? "bg-amber-950/80 border-amber-700 text-amber-300"
                                    : conn.protocol === "srt"
                                    ? "bg-blue-950/80 border-blue-700 text-blue-300"
                                    : "bg-neutral-800 border-neutral-700 text-neutral-300"
                                }`}
                              >
                                {conn.protocol.replace("_", " ")}
                              </span>
                              {isActive && (
                                <span className="text-[9px] bg-green-400 text-black px-1.5 py-0.5 font-black uppercase">
                                  ATIVO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 font-mono mt-0.5">
                              {conn.protocol === "webrtc_p2p"
                                ? `SALA: ${conn.roomCode} (Latência sub-50ms LAN)`
                                : conn.protocol === "rtmp"
                                ? `rtmp://${conn.host}:${conn.port}${conn.path}/${conn.streamKey || ""}`
                                : conn.protocol === "rtsp"
                                ? `rtsp://${conn.host}:${conn.port}${conn.path}`
                                : `srt://${conn.host}:${conn.port}?latency=${conn.srtLatencyMs || 120}ms`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingConnId(isEditing ? null : conn.id)}
                            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs uppercase font-bold tracking-wider transition-colors"
                          >
                            {isEditing ? "CONCLUIR" : "EDITAR"}
                          </button>
                          {localSettings.connections.length > 1 && (
                            <button
                              onClick={() => handleDeleteConnection(conn.id)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 border border-neutral-800 transition-colors"
                              title="Remover conexão"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Edit Section */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Nome da Conexão</label>
                            <input
                              type="text"
                              value={conn.name}
                              onChange={(e) => handleUpdateConnection(conn.id, { name: e.target.value })}
                              className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs text-white"
                            />
                          </div>

                          {conn.protocol === "webrtc_p2p" ? (
                            <div>
                              <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Código da Sala P2P</label>
                              <input
                                type="text"
                                value={conn.roomCode}
                                onChange={(e) => handleUpdateConnection(conn.id, { roomCode: e.target.value })}
                                className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs font-mono text-green-400 font-bold"
                              />
                            </div>
                          ) : (
                            <>
                              <div>
                                <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">IP do Computador / Host</label>
                                <input
                                  type="text"
                                  value={conn.host}
                                  onChange={(e) => handleUpdateConnection(conn.id, { host: e.target.value })}
                                  placeholder="192.168.1.X"
                                  className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs font-mono text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Porta</label>
                                <input
                                  type="number"
                                  value={conn.port}
                                  onChange={(e) => handleUpdateConnection(conn.id, { port: Number(e.target.value) })}
                                  className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs font-mono text-white"
                                />
                              </div>
                              {conn.protocol === "rtmp" && (
                                <>
                                  <div>
                                    <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Caminho da Aplicação</label>
                                    <input
                                      type="text"
                                      value={conn.path}
                                      onChange={(e) => handleUpdateConnection(conn.id, { path: e.target.value })}
                                      className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs font-mono text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Chave da Transmissão (Stream Key)</label>
                                    <input
                                      type="text"
                                      value={conn.streamKey || ""}
                                      onChange={(e) => handleUpdateConnection(conn.id, { streamKey: e.target.value })}
                                      className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs font-mono text-white"
                                    />
                                  </div>
                                </>
                              )}
                              {conn.protocol === "srt" && (
                                <div>
                                  <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Buffer de Latência SRT (ms)</label>
                                  <input
                                    type="number"
                                    value={conn.srtLatencyMs || 120}
                                    onChange={(e) => handleUpdateConnection(conn.id, { srtLatencyMs: Number(e.target.value) })}
                                    className="w-full bg-black border border-neutral-700 px-3 py-2 text-xs font-mono text-white"
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: VIDEO & ENCODING */}
          {activeTab === "video" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Resolution Preset */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    Resolução &amp; Taxa de Quadros (FPS)
                  </label>
                  <select
                    value={localSettings.resolution}
                    onChange={(e) => {
                      const res = e.target.value as VideoResolution;
                      const preset = RESOLUTION_PRESETS[res];
                      setLocalSettings((prev) => ({
                        ...prev,
                        resolution: res,
                        bitrateKbps: preset ? preset.recommendedBitrate : prev.bitrateKbps,
                      }));
                    }}
                    className="w-full bg-black border border-neutral-700 px-3.5 py-2.5 text-xs text-white focus:border-green-400 outline-none"
                  >
                    {Object.values(RESOLUTION_PRESETS).map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    4K e 1080p60 requerem hardware compatível e rede local 5GHz estável.
                  </p>
                </div>

                {/* Video Codec */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    Codec de Vídeo
                  </label>
                  <select
                    value={localSettings.codec}
                    onChange={(e) => handleUpdateSetting("codec", e.target.value as VideoCodec)}
                    className="w-full bg-black border border-neutral-700 px-3.5 py-2.5 text-xs text-white focus:border-green-400 outline-none"
                  >
                    <option value="H264">H.264 / AVC (Alta compatibilidade OBS/VLC/Hardware)</option>
                    <option value="HEVC_H265">H.265 / HEVC (Maior eficiência e 50% menos bitrate)</option>
                    <option value="VP8">VP8 (WebRTC padrão)</option>
                    <option value="VP9">VP9 (Alta qualidade WebRTC)</option>
                    <option value="AV1">AV1 (Próxima geração)</option>
                  </select>
                </div>

                {/* Bitrate Slider */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-white uppercase tracking-wider">
                      Taxa de Bits de Vídeo (Bitrate): <span className="text-green-400 font-mono">{localSettings.bitrateKbps} KBPS</span> ({((localSettings.bitrateKbps) / 1000).toFixed(1)} MBPS)
                    </label>
                    <span className="text-xs text-neutral-400 font-mono">Recomendado: 4500 - 8000 kbps</span>
                  </div>
                  <input
                    type="range"
                    min={800}
                    max={25000}
                    step={250}
                    value={localSettings.bitrateKbps}
                    onChange={(e) => handleUpdateSetting("bitrateKbps", Number(e.target.value))}
                    className="w-full accent-white h-2 bg-neutral-800 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                    <span>800 KBPS (SD)</span>
                    <span>4500 KBPS (1080P)</span>
                    <span>10000 KBPS (1080P60)</span>
                    <span>25000 KBPS (4K UHD)</span>
                  </div>
                </div>

                {/* Rate Control */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    Controle de Taxa (Rate Control)
                  </label>
                  <select
                    value={localSettings.rateControl}
                    onChange={(e) => handleUpdateSetting("rateControl", e.target.value as RateControl)}
                    className="w-full bg-black border border-neutral-700 px-3.5 py-2.5 text-xs text-white focus:border-green-400 outline-none"
                  >
                    <option value="CBR">CBR (Constant Bitrate - Ideal para transmissão ao vivo estável)</option>
                    <option value="VBR">VBR (Variable Bitrate - Economiza banda em cenas estáticas)</option>
                    <option value="ABR">ABR (Adaptive Bitrate - Reduz bitrate automaticamente se houver perda)</option>
                  </select>
                </div>

                {/* Keyframe Interval */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    Intervalo de Keyframes (GOP)
                  </label>
                  <select
                    value={localSettings.gopIntervalSec}
                    onChange={(e) => handleUpdateSetting("gopIntervalSec", Number(e.target.value))}
                    className="w-full bg-black border border-neutral-700 px-3.5 py-2.5 text-xs text-white focus:border-green-400 outline-none"
                  >
                    <option value={1}>1 segundo (Ultra-baixa latência e recuperação rápida)</option>
                    <option value={2}>2 segundos (Padrão RTMP / RTSP streaming)</option>
                    <option value={3}>3 segundos (Maior compressão)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO */}
          {activeTab === "audio" && (
            <div className="space-y-6">
              <div className="p-5 bg-black border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-white">Transmissão de Áudio do Microfone</h4>
                    <p className="text-xs text-neutral-400 font-mono">Capturar e transmitir som em tempo real com áudio em alta fidelidade</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.audioEnabled}
                    onChange={(e) => handleUpdateSetting("audioEnabled", e.target.checked)}
                    className="w-5 h-5 accent-green-400 cursor-pointer"
                  />
                </div>

                {localSettings.audioEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-800">
                    <div>
                      <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Taxa de Amostragem (Sample Rate)</label>
                      <select
                        value={localSettings.sampleRate}
                        onChange={(e) => handleUpdateSetting("sampleRate", Number(e.target.value) as 44100 | 48000)}
                        className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white"
                      >
                        <option value={48000}>48.000 Hz (Padrão Broadcast Profissional)</option>
                        <option value={44100}>44.100 Hz (CD Audio)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Canais</label>
                      <select
                        value={localSettings.channels}
                        onChange={(e) => handleUpdateSetting("channels", Number(e.target.value) as 1 | 2)}
                        className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white"
                      >
                        <option value={2}>Estéreo (2.0)</option>
                        <option value={1}>Mono (1.0)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Bitrate de Áudio AAC/Opus</label>
                      <select
                        value={localSettings.audioBitrateKbps}
                        onChange={(e) => handleUpdateSetting("audioBitrateKbps", Number(e.target.value))}
                        className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white"
                      >
                        <option value={128}>128 kbps (Alta Qualidade)</option>
                        <option value={192}>192 kbps (Estúdio)</option>
                        <option value={256}>256 kbps (Fidelidade Máxima)</option>
                        <option value={320}>320 kbps (Lossless feel)</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-center space-y-2 pt-2">
                      <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings.noiseSuppression}
                          onChange={(e) => handleUpdateSetting("noiseSuppression", e.target.checked)}
                          className="accent-green-400"
                        />
                        <span>Supressão de Ruído de Fundo (DSP)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings.echoCancellation}
                          onChange={(e) => handleUpdateSetting("echoCancellation", e.target.checked)}
                          className="accent-green-400"
                        />
                        <span>Cancelamento de Eco Acústico</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NETWORK & ABR */}
          {activeTab === "network" && (
            <div className="space-y-6">
              <div className="p-5 bg-black border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-white">Taxa de Bits Adaptativa (ABR)</h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      Reduz a taxa de bits instantaneamente em oscilações de sinal Wi-Fi para evitar perda de quadros
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.adaptiveBitrate}
                    onChange={(e) => handleUpdateSetting("adaptiveBitrate", e.target.checked)}
                    className="w-5 h-5 accent-green-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                  <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-white">Proteção contra Perda de Pacotes (FEC)</h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      Adiciona redundância de dados para recuperar pacotes UDP perdidos no Wi-Fi sem congelar o vídeo
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.packetLossProtection}
                    onChange={(e) => handleUpdateSetting("packetLossProtection", e.target.checked)}
                    className="w-5 h-5 accent-green-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOCAL RECORDING */}
          {activeTab === "recording" && (
            <div className="space-y-6">
              <div className="p-5 bg-black border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-white">Gravação Local Simultânea no Celular</h4>
                    <p className="text-xs text-neutral-400 font-mono">
                      Salva uma cópia limpa em resolução máxima na memória do dispositivo enquanto transmite ao vivo
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.localRecordingEnabled}
                    onChange={(e) => handleUpdateSetting("localRecordingEnabled", e.target.checked)}
                    className="w-5 h-5 accent-green-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-800">
                  <div>
                    <label className="text-[11px] text-neutral-400 font-mono uppercase block mb-1">Formato do Contêiner</label>
                    <select
                      value={localSettings.recordingFormat}
                      onChange={(e) => handleUpdateSetting("recordingFormat", e.target.value as "mp4" | "webm")}
                      className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs text-white"
                    >
                      <option value="mp4">MP4 (H.264 + AAC - Padrão de edição Premiere/DaVinci)</option>
                      <option value="webm">WebM (H.264/VP9 + Opus)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-black">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
          >
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};
