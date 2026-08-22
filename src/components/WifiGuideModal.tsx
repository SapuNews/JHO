import React, { useState } from "react";
import { Wifi, Radio, Tv, Laptop, Smartphone, Copy, Check, ArrowRight, ShieldCheck, Zap } from "lucide-react";

interface WifiGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  localIp: string;
  roomCode: string;
}

export const WifiGuideModal: React.FC<WifiGuideModalProps> = ({
  isOpen,
  onClose,
  localIp,
  roomCode,
}) => {
  const [activeTab, setActiveTab] = useState<"hotspot" | "lan" | "obs" | "rtmp">("hotspot");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const receiverUrl = `${window.location.origin}/?mode=receiver&room=${roomCode}`;
  const obsCleanUrl = `${window.location.origin}/?mode=receiver&room=${roomCode}&clean=true`;
  const rtspExampleUrl = `rtsp://${localIp}:8554/live/${roomCode}`;
  const rtmpExampleUrl = `rtmp://${localIp}:1935/live/${roomCode}`;
  const srtExampleUrl = `srt://${localIp}:9998?mode=listener&latency=20000`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-neutral-950 border border-neutral-800 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-black">
          <div className="flex items-center space-x-3">
            <div className="p-2 border border-neutral-800 bg-neutral-900 text-white">
              <Wifi className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xs uppercase font-black tracking-widest flex items-center space-x-2">
                <span>Guia: Transmissão Local Sem Internet</span>
                <span className="text-[9px] px-2 py-0.5 border border-neutral-800 bg-neutral-900 text-green-400 font-mono font-bold">
                  WI-FI / HOTSPOT
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Transmita vídeo 4K/1080p da câmera do celular direto para o PC com latência sub-50ms
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
            onClick={() => setActiveTab("hotspot")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "hotspot"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>1. Hotspot Ponto de Acesso</span>
          </button>
          <button
            onClick={() => setActiveTab("lan")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "lan"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>2. Roteador Wi-Fi (LAN)</span>
          </button>
          <button
            onClick={() => setActiveTab("obs")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "obs"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>3. OBS Studio / vMix</span>
          </button>
          <button
            onClick={() => setActiveTab("rtmp")}
            className={`flex items-center space-x-2 px-4 py-3 text-xs uppercase font-black tracking-wider border-b-2 whitespace-nowrap transition-all ${
              activeTab === "rtmp"
                ? "border-green-400 text-green-400 bg-neutral-900"
                : "border-transparent text-neutral-400 hover:text-white"
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>4. RTSP / RTMP / SRT</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm text-neutral-300 leading-relaxed">
          {activeTab === "hotspot" && (
            <div className="space-y-4">
              <div className="p-4 bg-black border border-green-500/40 flex items-start space-x-3">
                <Zap className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs uppercase font-black tracking-widest text-green-400">
                    Modo 100% Offline (Sem Roteador e Sem Internet Externa)
                  </h4>
                  <p className="text-xs text-neutral-300 font-mono mt-1">
                    Você pode usar seu smartphone no campo, em estúdios externos ou em eventos sem depender de conexão com a internet.
                  </p>
                </div>
              </div>

              <ol className="space-y-3 pl-1">
                <li className="flex items-start space-x-3">
                  <span className="flex items-center justify-center w-6 h-6 border border-neutral-700 bg-neutral-900 text-green-400 text-xs font-black font-mono shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-white uppercase font-bold">No Celular:</strong> Ative o <strong>Ponto de Acesso Wi-Fi Móvel (Roteador Wi-Fi / Hotspot)</strong> nas configurações do Android/iOS. (Não é necessário ter dados móveis ativos).
                  </div>
                </li>

                <li className="flex items-start space-x-3">
                  <span className="flex items-center justify-center w-6 h-6 border border-neutral-700 bg-neutral-900 text-green-400 text-xs font-black font-mono shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-white uppercase font-bold">No Computador (PC/Notebook):</strong> Conecte a placa Wi-Fi do seu computador na rede Wi-Fi criada pelo celular.
                  </div>
                </li>

                <li className="flex items-start space-x-3">
                  <span className="flex items-center justify-center w-6 h-6 border border-neutral-700 bg-neutral-900 text-green-400 text-xs font-black font-mono shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-white uppercase font-bold">No Navegador do PC ou OBS:</strong> Abra a URL do Receptor P2P gerada abaixo ou escaneie o QR Code. A transmissão começará imediatamente com latência inferior a 30 milissegundos!
                  </div>
                </li>
              </ol>

              {/* Quick URL Copy */}
              <div className="bg-black p-4 border border-neutral-800 space-y-2">
                <span className="text-[11px] text-neutral-400 font-mono uppercase">Link direto do Receptor no PC:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={receiverUrl}
                    className="flex-1 bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs font-mono text-green-400"
                  />
                  <button
                    onClick={() => copyToClipboard(receiverUrl, "recUrl")}
                    className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 transition-colors shrink-0"
                  >
                    {copiedKey === "recUrl" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "recUrl" ? "COPIADO" : "COPIAR"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "lan" && (
            <div className="space-y-4">
              <div className="p-4 bg-black border border-blue-500/40 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs uppercase font-black tracking-widest text-blue-400">
                    Modo Rede Local Wi-Fi Doméstica / Estúdio (5GHz Recomendado)
                  </h4>
                  <p className="text-xs text-neutral-300 font-mono mt-1">
                    Conecte o smartphone e o computador na mesma rede Wi-Fi (de preferência na faixa de 5GHz para largura de banda de até 150 Mbps).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black p-4 border border-neutral-800 space-y-2">
                  <span className="text-[11px] text-neutral-400 font-mono uppercase">IP Local Detectado:</span>
                  <div className="text-2xl font-display font-black text-green-400">{localIp || "192.168.1.X"}</div>
                  <p className="text-xs text-neutral-500 font-mono">
                    O tráfego de vídeo trafega exclusivamente dentro dos switches e antenas locais, sem consumir internet externa.
                  </p>
                </div>

                <div className="bg-black p-4 border border-neutral-800 space-y-2">
                  <span className="text-[11px] text-neutral-400 font-mono uppercase">Sala P2P Única:</span>
                  <div className="text-2xl font-display font-black text-amber-400">{roomCode}</div>
                  <p className="text-xs text-neutral-500 font-mono">
                    Garante emparelhamento criptografado e direto com o monitor do diretor ou OBS Studio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "obs" && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-black tracking-widest text-white">
                Como adicionar a câmera do celular no OBS Studio / vMix:
              </h4>

              <div className="space-y-3">
                <div className="p-4 bg-black border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-green-400 uppercase tracking-wider">
                      Método 1: Fonte de Navegador (Browser Source) - Ultra Baixa Latência
                    </span>
                    <button
                      onClick={() => copyToClipboard(obsCleanUrl, "obsClean")}
                      className="text-xs text-green-400 hover:text-green-300 font-bold uppercase tracking-wider flex items-center space-x-1"
                    >
                      {copiedKey === "obsClean" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "obsClean" ? "COPIADO" : "COPIAR URL LIMPA"}</span>
                    </button>
                  </div>
                  <ol className="text-xs text-neutral-300 space-y-1.5 list-decimal pl-4 font-mono">
                    <li>No OBS Studio, em <strong>Fontes (Sources)</strong>, clique em <strong>+ &gt; Navegador (Browser)</strong>.</li>
                    <li>Cole a URL abaixo no campo <strong>URL</strong>.</li>
                    <li>Defina a largura como <strong>1920</strong> e altura como <strong>1080</strong> (ou 3840x2160 para 4K).</li>
                    <li>Marque a opção <em>"Controlar áudio via OBS"</em> caso queira mixar o microfone do celular.</li>
                  </ol>
                  <input
                    type="text"
                    readOnly
                    value={obsCleanUrl}
                    className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs font-mono text-green-400"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "rtmp" && (
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-black tracking-widest text-white">
                Servidores Tradicionais de Streaming Local (RTSP / RTMP / SRT):
              </h4>
              <p className="text-xs text-neutral-400 font-mono">
                Se você já possui um servidor local como <strong>MediaMTX (RTSP Simple Server)</strong>, <strong>SRS</strong>, <strong>NodeMediaServer</strong> ou <strong>MonaServer</strong> rodando no PC:
              </p>

              <div className="space-y-3">
                <div className="bg-black p-3.5 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-400 font-mono font-bold uppercase">RTSP Push / Pull URL:</span>
                    <button
                      onClick={() => copyToClipboard(rtspExampleUrl, "rtspUrl")}
                      className="text-neutral-400 hover:text-white font-mono uppercase text-[10px]"
                    >
                      {copiedKey === "rtspUrl" ? "COPIADO" : "COPIAR"}
                    </button>
                  </div>
                  <code className="text-xs text-neutral-300 font-mono block bg-neutral-900 px-2.5 py-1.5 border border-neutral-800">
                    {rtspExampleUrl}
                  </code>
                </div>

                <div className="bg-black p-3.5 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-400 font-mono font-bold uppercase">RTMP Local Target:</span>
                    <button
                      onClick={() => copyToClipboard(rtmpExampleUrl, "rtmpUrl")}
                      className="text-neutral-400 hover:text-white font-mono uppercase text-[10px]"
                    >
                      {copiedKey === "rtmpUrl" ? "COPIADO" : "COPIAR"}
                    </button>
                  </div>
                  <code className="text-xs text-neutral-300 font-mono block bg-neutral-900 px-2.5 py-1.5 border border-neutral-800">
                    {rtmpExampleUrl}
                  </code>
                </div>

                <div className="bg-black p-3.5 border border-neutral-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-purple-400 font-mono font-bold uppercase">SRT Caller / Listener:</span>
                    <button
                      onClick={() => copyToClipboard(srtExampleUrl, "srtUrl")}
                      className="text-neutral-400 hover:text-white font-mono uppercase text-[10px]"
                    >
                      {copiedKey === "srtUrl" ? "COPIADO" : "COPIAR"}
                    </button>
                  </div>
                  <code className="text-xs text-neutral-300 font-mono block bg-neutral-900 px-2.5 py-1.5 border border-neutral-800">
                    {srtExampleUrl}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-neutral-800 bg-black">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black uppercase tracking-wider transition-colors shadow-lg"
          >
            Entendido, fechar guia
          </button>
        </div>
      </div>
    </div>
  );
};
