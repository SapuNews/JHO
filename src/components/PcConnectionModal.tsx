import React, { useState } from "react";
import { BroadcastSettings } from "../types";
import { Laptop, Wifi, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, Terminal, ShieldAlert, Zap, X } from "lucide-react";

interface PcConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BroadcastSettings;
  onSave: (newSettings: BroadcastSettings) => void;
  localIp: string;
}

export const PcConnectionModal: React.FC<PcConnectionModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  localIp,
}) => {
  const activeConn = settings.connections.find((c) => c.id === settings.activeConnectionId) || settings.connections[0];

  const [pcIp, setPcIp] = useState<string>(
    settings.targetPcIp || activeConn?.host || localIp || "192.168.1.100"
  );
  const [pcPort, setPcPort] = useState<number>(settings.targetPcPort || 3000);
  const [roomCode, setRoomCode] = useState<string>(activeConn?.roomCode || "larix-studio-1");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState<string>("");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"windows" | "mac" | "firewall">("windows");

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("Enviando ping para o IP do PC...");
    setTestLatency(null);

    const startTime = performance.now();
    const cleanIp = pcIp.trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const targetUrl = `http://${cleanIp}:${pcPort}/api/ping`;
      const response = await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { "Accept": "application/json" },
      });

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);

      if (response.ok) {
        setTestStatus("success");
        setTestLatency(elapsed);
        setTestMessage(`Conectado com sucesso ao servidor do PC em ${elapsed}ms! Pronto para transmitir.`);
      } else {
        setTestStatus("error");
        setTestMessage(`Servidor respondeu com status HTTP ${response.status}. Verifique se a aplicação está rodando na porta ${pcPort}.`);
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setTestStatus("error");
      if (err.name === "AbortError") {
        setTestMessage(`Tempo esgotado (Timeout). O IP ${cleanIp}:${pcPort} não respondeu. Verifique se o PC e o celular estão no mesmo Wi-Fi e se o Firewall do Windows está liberando a porta ${pcPort}.`);
      } else {
        setTestMessage(`Falha na conexão com http://${cleanIp}:${pcPort}. Dica: certifique-se de que o servidor no PC está aberto e os aparelhos estão no mesmo roteador.`);
      }
    }
  };

  const handleApplyPreset = (prefix: string) => {
    if (prefix.endsWith(".")) {
      const lastOctet = pcIp.split(".")[3] || "100";
      setPcIp(`${prefix}${lastOctet}`);
    } else {
      setPcIp(prefix);
    }
  };

  const handleSaveAndApply = () => {
    const cleanIp = pcIp.trim();
    const updatedConnections = settings.connections.map((c) => {
      if (c.id === settings.activeConnectionId || c.protocol === "webrtc_p2p") {
        return {
          ...c,
          host: cleanIp,
          port: pcPort,
          roomCode: roomCode.trim(),
        };
      }
      return c;
    });

    const newSettings: BroadcastSettings = {
      ...settings,
      targetPcIp: cleanIp,
      targetPcPort: pcPort,
      connections: updatedConnections,
    };

    onSave(newSettings);
    onClose();
  };

  const copyFirewallCommand = () => {
    const cmd = `netsh advfirewall firewall add rule name="SN-trean 3000" dir=in action=allow protocol=TCP localport=${pcPort}`;
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-neutral-950/95 border border-white/15 w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 rounded-xl">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-white">
                  Conexão APK &lt;-&gt; Computador (IP Local)
                </h2>
                <span className="text-[9px] px-2 py-0.5 border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 font-mono font-bold rounded-full">
                  WI-FI DIRETO
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Transmita vídeo em tempo real do celular para o PC na mesma rede sem precisar de internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-sm text-neutral-300">
          
          {/* Diagnostic Status Alert */}
          {testStatus === "success" && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/60 rounded-xl flex items-start space-x-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">PC Conectado e Respondendo</span>
                  {testLatency !== null && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700">
                      PING: {testLatency}ms
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-300 font-mono mt-0.5">{testMessage}</p>
              </div>
            </div>
          )}

          {testStatus === "error" && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/60 rounded-xl flex items-start space-x-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400 block">Falha ao Conectar ao IP do PC</span>
                <p className="text-xs text-neutral-300 font-mono mt-0.5">{testMessage}</p>
              </div>
            </div>
          )}

          {/* Form Fields: PC IP & Port */}
          <div className="p-4 bg-neutral-900/60 border border-white/10 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono font-bold tracking-widest text-white flex items-center space-x-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Endereço de Rede do PC Receptor</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                Porta Padrão: 3000
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] text-neutral-400 font-mono uppercase block mb-1">
                  Endereço IP do Computador (IPv4)
                </label>
                <input
                  type="text"
                  value={pcIp}
                  onChange={(e) => {
                    setPcIp(e.target.value);
                    setTestStatus("idle");
                  }}
                  placeholder="Ex: 192.168.1.105"
                  className="w-full bg-neutral-950 border border-white/15 focus:border-emerald-400 px-3.5 py-2.5 rounded-xl text-sm font-mono text-emerald-400 font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 font-mono uppercase block mb-1">
                  Porta do Servidor
                </label>
                <input
                  type="number"
                  value={pcPort}
                  onChange={(e) => {
                    setPcPort(Number(e.target.value));
                    setTestStatus("idle");
                  }}
                  placeholder="3000"
                  className="w-full bg-neutral-950 border border-white/15 focus:border-emerald-400 px-3.5 py-2.5 rounded-xl text-sm font-mono text-white outline-none"
                />
              </div>
            </div>

            {/* Quick Preset Subnets */}
            <div>
              <span className="text-[10px] text-neutral-400 font-mono uppercase block mb-1.5 font-bold">
                Preenchimento Rápido de Faixa de IP:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "192.168.1.x (Roteador Comum)", val: "192.168.1." },
                  { label: "192.168.0.x (TP-Link / D-Link)", val: "192.168.0." },
                  { label: "192.168.15.x (Vivo Fibra)", val: "192.168.15." },
                  { label: "192.168.43.1 (Hotspot Android)", val: "192.168.43.1" },
                  { label: "172.20.10.1 (Hotspot iPhone)", val: "172.20.10.1" },
                  { label: "10.0.0.x (Estúdio LAN)", val: "10.0.0." },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleApplyPreset(item.val)}
                    className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-white/10 hover:border-emerald-500/40 text-neutral-300 hover:text-emerald-400 text-[10px] font-mono rounded-lg transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Code */}
            <div className="pt-3 border-t border-white/10">
              <label className="text-[10px] text-neutral-400 font-mono uppercase block mb-1">
                Código da Sala P2P (Deve ser igual no PC e no Celular)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="larix-studio-1"
                  className="flex-1 bg-neutral-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white uppercase outline-none"
                />
                <button
                  onClick={() => setRoomCode(`larix-${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-white/15 rounded-xl text-neutral-300 text-xs font-mono"
                  title="Gerar código aleatório"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === "testing" || !pcIp.trim()}
                className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-md"
              >
                {testStatus === "testing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Testando Conexão com {pcIp}:{pcPort}...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Testar Conexão / Ping com o PC</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Tutorial: How to find PC IP */}
          <div className="p-4 bg-neutral-900/40 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-white flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-neutral-400" />
                <span>Como Descobrir o IP do seu Computador</span>
              </h3>

              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveGuideTab("windows")}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors ${
                    activeGuideTab === "windows"
                      ? "bg-white text-black"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  Windows
                </button>
                <button
                  onClick={() => setActiveGuideTab("mac")}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors ${
                    activeGuideTab === "mac"
                      ? "bg-white text-black"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  macOS / Linux
                </button>
                <button
                  onClick={() => setActiveGuideTab("firewall")}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-colors ${
                    activeGuideTab === "firewall"
                      ? "bg-amber-400 text-black"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  Firewall
                </button>
              </div>
            </div>

            {/* Guide: Windows */}
            {activeGuideTab === "windows" && (
              <div className="space-y-2 text-xs font-mono text-neutral-300">
                <p className="text-neutral-400">1. No seu teclado do PC, pressione <span className="text-white font-bold">Win + R</span>, digite <span className="text-emerald-400 font-bold">cmd</span> e tecle Enter.</p>
                <p className="text-neutral-400">2. No terminal preto, digite <span className="text-emerald-400 font-bold">ipconfig</span> e tecle Enter.</p>
                <p className="text-neutral-400">3. Procure por <span className="text-white font-bold">"Adaptador de Rede Sem Fio Wi-Fi"</span> ou <span className="text-white font-bold">"Ethernet"</span> e veja a linha <span className="text-emerald-400 font-bold">Endereço IPv4</span> (ex: 192.168.1.105).</p>
                <p className="text-neutral-400">4. Digite esse mesmo número no campo acima e clique em "Salvar e Conectar".</p>
              </div>
            )}

            {/* Guide: Mac/Linux */}
            {activeGuideTab === "mac" && (
              <div className="space-y-2 text-xs font-mono text-neutral-300">
                <p className="text-neutral-400">1. No Mac: Abra <span className="text-white font-bold">Ajustes do Sistema &gt; Rede &gt; Wi-Fi &gt; Detalhes</span>.</p>
                <p className="text-neutral-400">2. Ou no Terminal Mac/Linux, execute: <span className="text-emerald-400 font-bold">ipconfig getifaddr en0</span> ou <span className="text-emerald-400 font-bold">hostname -I</span>.</p>
              </div>
            )}

            {/* Guide: Firewall */}
            {activeGuideTab === "firewall" && (
              <div className="space-y-2.5 text-xs font-mono text-neutral-300">
                <div className="flex items-start space-x-2 text-amber-300">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Se o ping falhar, o Firewall do Windows pode estar bloqueando a porta {pcPort}.</span>
                </div>
                <p className="text-neutral-400">Para liberar a porta 3000 no Windows em 1 segundo, abra o PowerShell como Administrador e cole:</p>
                <div className="flex items-center justify-between p-2.5 bg-black border border-white/10 rounded-xl text-emerald-400 text-[11px]">
                  <span className="truncate font-mono">netsh advfirewall firewall add rule name="Larix Studio 3000" dir=in action=allow protocol=TCP localport={pcPort}</span>
                  <button
                    onClick={copyFirewallCommand}
                    className="ml-2 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-mono uppercase font-bold rounded-lg shrink-0 flex items-center space-x-1"
                  >
                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd ? "COPIADO" : "COPIAR"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 text-xs font-mono font-bold uppercase rounded-xl transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSaveAndApply}
            className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Salvar e Conectar ao PC</span>
          </button>
        </div>
      </div>
    </div>
  );
};
