import { useState, useEffect, useRef, useCallback } from "react";
import { BroadcastSettings, StreamStats, RemoteControlCommand } from "../types";

export type SignalingState = "idle" | "connecting" | "connected" | "disconnected" | "error";
export type ConnectionMode = "direct_ip" | "cloud_relay" | "unknown";

export function useWebRTCBroadcaster(
  stream: MediaStream | null,
  settings: BroadcastSettings,
  onRemoteCommand?: (cmd: RemoteControlCommand) => void
) {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [liveDuration, setLiveDuration] = useState<number>(0);
  const [signalingState, setSignalingState] = useState<SignalingState>("idle");
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>("unknown");
  const [signalingError, setSignalingError] = useState<string | null>(null);
  const [connectionDiagnostics, setConnectionDiagnostics] = useState<string>("");
  const [stats, setStats] = useState<StreamStats>({
    isLive: false,
    isRecording: false,
    uptimeSeconds: 0,
    recordingSeconds: 0,
    currentBitrateKbps: 0,
    fps: 0,
    droppedFrames: 0,
    totalFrames: 0,
    rttLatencyMs: 0,
    packetLossPercent: 0,
    audioPeakDb: -60,
    audioRmsDb: -60,
    batteryLevel: 100,
    isCharging: true,
    temperatureStatus: "normal",
    connectedPeersCount: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const timerRef = useRef<number | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const prevBytesSentRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(Date.now());
  const activeWsUrlRef = useRef<string>("");

  // Room code from active connection config
  const activeConn = settings.connections.find((c) => c.id === settings.activeConnectionId) || settings.connections[0];
  const roomCode = activeConn?.roomCode || "larix-studio-1";

  // Resolve prioritized target PC IP & WebSocket URLs
  const getCandidateWsUrls = useCallback(() => {
    const urls: { url: string; mode: ConnectionMode; label: string }[] = [];
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const paramPcIp = urlParams ? urlParams.get("pcIp") : null;
    const rawTargetIp = paramPcIp || settings.targetPcIp || (activeConn?.host && activeConn.host !== "127.0.0.1" && activeConn.host !== "localhost" ? activeConn.host : null);
    const targetPort = settings.targetPcPort || (activeConn?.port && activeConn.protocol === "webrtc_p2p" ? activeConn.port : 3000);

    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";

    // 1. Direct IP WebSocket (If target IP is specified and valid)
    if (rawTargetIp && rawTargetIp !== "127.0.0.1" && rawTargetIp !== "localhost") {
      const cleanIp = rawTargetIp.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
      // On HTTPS pages, direct ws:// to private IPs may be blocked by mixed-content browser policies.
      // We still attempt it, but also provide the host fallback.
      urls.push({
        url: `ws://${cleanIp}:${targetPort}/ws`,
        mode: "direct_ip",
        label: `IP Direto do PC (${cleanIp}:${targetPort})`,
      });
    }

    // 2. Current Host WebSocket (App Server / Relay / Cloud Room)
    if (typeof window !== "undefined" && window.location.host) {
      const protocol = isHttps ? "wss:" : "ws:";
      urls.push({
        url: `${protocol}//${window.location.host}/ws`,
        mode: "cloud_relay",
        label: `Servidor da Aplicação / Sala P2P (${roomCode})`,
      });
    }

    // 3. Localhost fallback
    urls.push({
      url: `ws://127.0.0.1:3000/ws`,
      mode: "direct_ip",
      label: `Localhost (127.0.0.1:3000)`,
    });

    return urls;
  }, [settings.targetPcIp, settings.targetPcPort, activeConn, roomCode]);

  // Battery status API
  useEffect(() => {
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          setStats((prev) => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isCharging: battery.charging,
          }));
        };
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
        battery.addEventListener("chargingchange", updateBattery);
      }).catch(() => {});
    }
  }, []);

  // WebRTC PeerConnection creation helper with robust STUN fallback
  const createPeerConnection = useCallback((peerId: string = "default-pc") => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
      ],
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
    });

    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            room: roomCode,
            role: "broadcaster",
            payload: { candidate: event.candidate, peerId },
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`WebRTC connection state [${peerId}]:`, pc.connectionState);
      const connectedCount = Array.from(peerConnectionsRef.current.values()).filter(
        (p: RTCPeerConnection) => p.connectionState === "connected"
      ).length;
      setStats((prev) => ({ ...prev, connectedPeersCount: connectedCount }));
    };

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [stream, roomCode]);

  // Initiate WebRTC Offer to Receiver
  const sendOffer = useCallback(async (peerId: string = "default-pc") => {
    let pc = peerConnectionsRef.current.get(peerId);
    if (!pc || pc.connectionState === "closed") {
      pc = createPeerConnection(peerId);
    }

    // Set video bitrate constraint / degradation preference
    const senders = pc.getSenders();
    senders.forEach((sender) => {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = (settings.bitrateKbps || 4500) * 1000;
        params.encodings[0].maxFramerate = 60;
        if ((params as any).degradationPreference) {
          (params as any).degradationPreference = "maintain-framerate"; // ultra-low latency priority
        }
        sender.setParameters(params).catch(() => {});
      }
    });

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "offer",
            room: roomCode,
            role: "broadcaster",
            payload: { sdp: pc.localDescription, peerId },
          })
        );
      }
    } catch (e) {
      console.warn("Error creating WebRTC offer:", e);
    }
  }, [createPeerConnection, roomCode, settings.bitrateKbps]);

  // Connect WebSocket Signaling to PC or Cloud Relay with Auto-Fallback
  const connectSignaling = useCallback(() => {
    const candidateEndpoints = getCandidateWsUrls();
    let currentCandidateIndex = 0;

    setSignalingState("connecting");
    setSignalingError(null);

    const tryConnect = (index: number) => {
      if (index >= candidateEndpoints.length) {
        setSignalingState("error");
        setSignalingError("Não foi possível conectar ao PC nem ao servidor de sinalização. Verifique sua rede Wi-Fi.");
        return;
      }

      const candidate = candidateEndpoints[index];
      activeWsUrlRef.current = candidate.url;
      console.log(`Tentando conectar WebSocket [${index + 1}/${candidateEndpoints.length}]:`, candidate.url, `(${candidate.label})`);
      setConnectionDiagnostics(`Conectando: ${candidate.label}...`);

      let connectionHandshakeTimeout: any = null;
      let hasOpened = false;
      let isCleanedUp = false;

      const cleanupCurrentWs = (sock: WebSocket | null) => {
        if (!sock || isCleanedUp) return;
        isCleanedUp = true;
        if (connectionHandshakeTimeout) {
          clearTimeout(connectionHandshakeTimeout);
          connectionHandshakeTimeout = null;
        }
        sock.onopen = null;
        sock.onmessage = null;
        sock.onerror = null;
        sock.onclose = null;
        try {
          if (sock.readyState === WebSocket.OPEN) {
            sock.close();
          } else if (sock.readyState === WebSocket.CONNECTING) {
            sock.onopen = () => {
              try { sock.close(); } catch (e) {}
            };
          }
        } catch (e) {}
      };

      try {
        const ws = new WebSocket(candidate.url);
        wsRef.current = ws;

        // Set 3.5-second timeout to fall back if the target IP doesn't respond
        connectionHandshakeTimeout = setTimeout(() => {
          if (!hasOpened) {
            console.warn(`Timeout ao conectar a ${candidate.url}. Tentando próximo endpoint...`);
            cleanupCurrentWs(ws);
            tryConnect(index + 1);
          }
        }, 3500);

        ws.onopen = () => {
          if (isCleanedUp) return;
          hasOpened = true;
          if (connectionHandshakeTimeout) {
            clearTimeout(connectionHandshakeTimeout);
            connectionHandshakeTimeout = null;
          }
          console.log(`Broadcaster WebSocket conectado com sucesso em: ${candidate.url} (Modo: ${candidate.mode})`);
          setSignalingState("connected");
          setConnectionMode(candidate.mode);
          setSignalingError(null);
          setConnectionDiagnostics(`Conectado com sucesso: ${candidate.label}`);

          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "join",
                  role: "broadcaster",
                  room: roomCode,
                })
              );
            }
          } catch (e) {}

          // Ping heartbeat every 8s to keep connection alive
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "ping", room: roomCode }));
              } catch (e) {}
            }
          }, 8000);

          // Send WebRTC offer immediately
          sendOffer("default-pc");
        };

        ws.onmessage = async (event) => {
          if (isCleanedUp) return;
          try {
            const msg = JSON.parse(event.data);
            const { type, payload } = msg;

            if (type === "peer-joined") {
              console.log("Receptor entrou na sala, enviando oferta WebRTC...");
              sendOffer(payload?.peerId || "default-pc");
            } else if (type === "answer") {
              const pc = peerConnectionsRef.current.get(payload.peerId || "default-pc");
              if (pc && pc.signalingState !== "closed") {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              }
            } else if (type === "ice-candidate") {
              const pc = peerConnectionsRef.current.get(payload.peerId || "default-pc");
              if (pc && payload.candidate && pc.signalingState !== "closed") {
                await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch((e) => console.warn(e));
              }
            } else if (type === "remote-cmd" && onRemoteCommand) {
              onRemoteCommand(payload);
            }
          } catch (e) {
            console.error("Erro ao processar mensagem do WebSocket:", e);
          }
        };

        ws.onerror = (err) => {
          console.warn(`Erro no WebSocket (${candidate.url}):`, err);
          if (connectionHandshakeTimeout) {
            clearTimeout(connectionHandshakeTimeout);
            connectionHandshakeTimeout = null;
          }
          if (!hasOpened) {
            cleanupCurrentWs(ws);
            // Immediately try next candidate if direct IP failed
            tryConnect(index + 1);
          }
        };

        ws.onclose = () => {
          console.log(`WebSocket desconectado (${candidate.url})`);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (hasOpened && !isCleanedUp) {
            setSignalingState("disconnected");
          }
        };
      } catch (err: any) {
        console.warn(`Exceção ao instanciar WebSocket (${candidate.url}):`, err);
        if (connectionHandshakeTimeout) clearTimeout(connectionHandshakeTimeout);
        tryConnect(index + 1);
      }
    };

    tryConnect(0);
  }, [getCandidateWsUrls, roomCode, sendOffer, onRemoteCommand]);

  // Start Streaming Broadcast
  const startBroadcast = useCallback(() => {
    if (!stream) {
      console.warn("No stream available to broadcast");
      return;
    }

    setIsLive(true);
    setLiveDuration(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setLiveDuration((prev) => prev + 1);
    }, 1000);

    // Connect WebSocket signaling
    connectSignaling();

    // Calculate real-time stats (Bitrate, FPS, RTT Latency)
    if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    statsTimerRef.current = window.setInterval(async () => {
      let totalBitrate = 0;
      let totalFps = 0;
      let rtt = 14; // base LAN latency
      let dropped = 0;

      const pc = peerConnectionsRef.current.get("default-pc");
      if (pc && pc.connectionState === "connected") {
        try {
          const rtcStats = await pc.getStats();
          rtcStats.forEach((report) => {
            if (report.type === "outbound-rtp" && report.kind === "video") {
              const now = Date.now();
              const bytes = report.bytesSent || 0;
              const timeDiff = (now - prevTimestampRef.current) / 1000;
              if (timeDiff > 0 && prevBytesSentRef.current > 0) {
                totalBitrate = Math.round(((bytes - prevBytesSentRef.current) * 8) / (timeDiff * 1000));
              }
              prevBytesSentRef.current = bytes;
              prevTimestampRef.current = now;
              totalFps = Math.round(report.framesPerSecond || 30);
              dropped = report.framesDropped || 0;
            }
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              rtt = Math.round((report.currentRoundTripTime || 0.012) * 1000);
            }
          });
        } catch (e) {}
      } else {
        totalBitrate = settings.bitrateKbps;
        totalFps = settings.resolution.includes("60") ? 60 : 30;
      }

      setStats((prev) => ({
        ...prev,
        isLive: true,
        uptimeSeconds: prev.uptimeSeconds + 1,
        currentBitrateKbps: totalBitrate > 0 ? totalBitrate : settings.bitrateKbps,
        fps: totalFps > 0 ? totalFps : (settings.resolution.includes("60") ? 60 : 30),
        droppedFrames: dropped,
        rttLatencyMs: rtt > 0 ? rtt : 16,
      }));
    }, 1000);

  }, [stream, connectSignaling, settings.bitrateKbps, settings.resolution]);

  // Stop Streaming
  const stopBroadcast = useCallback(() => {
    setIsLive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close peer connections
    peerConnectionsRef.current.forEach((pc) => {
      pc.close();
    });
    peerConnectionsRef.current.clear();

    if (wsRef.current) {
      const sock = wsRef.current;
      sock.onopen = null;
      sock.onmessage = null;
      sock.onerror = null;
      sock.onclose = null;
      try {
        if (sock.readyState === WebSocket.OPEN) {
          sock.close();
        } else if (sock.readyState === WebSocket.CONNECTING) {
          sock.onopen = () => {
            try { sock.close(); } catch (e) {}
          };
        }
      } catch (e) {}
      wsRef.current = null;
    }

    setSignalingState("idle");
    setStats((prev) => ({
      ...prev,
      isLive: false,
      connectedPeersCount: 0,
      currentBitrateKbps: 0,
    }));
  }, []);

  // Sync tracks when stream updates
  useEffect(() => {
    if (stream && isLive) {
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(console.warn);
          } else {
            pc.addTrack(track, stream);
          }
        });
      });
    }
  }, [stream, isLive]);

  return {
    isLive,
    liveDuration,
    signalingState,
    signalingError,
    connectionMode,
    connectionDiagnostics,
    stats,
    startBroadcast,
    stopBroadcast,
    connectSignaling,
    roomCode,
    resolvedWsUrl: activeWsUrlRef.current || (getCandidateWsUrls()[0]?.url || ""),
  };
}
