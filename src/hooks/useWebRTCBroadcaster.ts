import { useState, useEffect, useRef, useCallback } from "react";
import { BroadcastSettings, StreamStats, RemoteControlCommand } from "../types";

export type SignalingState = "idle" | "connecting" | "connected" | "disconnected" | "error";

export function useWebRTCBroadcaster(
  stream: MediaStream | null,
  settings: BroadcastSettings,
  onRemoteCommand?: (cmd: RemoteControlCommand) => void
) {
  const [isLive, setIsLive] = useState<boolean>(false);
  const [liveDuration, setLiveDuration] = useState<number>(0);
  const [signalingState, setSignalingState] = useState<SignalingState>("idle");
  const [signalingError, setSignalingError] = useState<string | null>(null);
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

  // Room code from active connection config
  const activeConn = settings.connections.find((c) => c.id === settings.activeConnectionId) || settings.connections[0];
  const roomCode = activeConn?.roomCode || "larix-studio-1";

  // Resolve target PC IP & WebSocket URL
  const getTargetWsUrl = useCallback(() => {
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const paramPcIp = urlParams ? urlParams.get("pcIp") : null;
    const targetIp = paramPcIp || settings.targetPcIp || (activeConn?.host && activeConn.host !== "127.0.0.1" && activeConn.host !== "localhost" ? activeConn.host : null);
    const targetPort = settings.targetPcPort || (activeConn?.port && activeConn.protocol === "webrtc_p2p" ? activeConn.port : 3000);

    // If explicit PC IP is set or in standalone APK / Capacitor runtime
    if (targetIp && targetIp !== "127.0.0.1" && targetIp !== "localhost") {
      return `ws://${targetIp}:${targetPort}/ws`;
    }

    if (typeof window !== "undefined" && window.location.host) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}/ws`;
    }

    return `ws://127.0.0.1:3000/ws`;
  }, [settings.targetPcIp, settings.targetPcPort, activeConn]);

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

  // WebRTC PeerConnection creation helper
  const createPeerConnection = useCallback((peerId: string = "default-pc") => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
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

  // Connect WebSocket Signaling to PC
  const connectSignaling = useCallback(() => {
    const wsUrl = getTargetWsUrl();
    console.log("Connecting Broadcaster signaling to:", wsUrl);
    setSignalingState("connecting");
    setSignalingError(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Broadcaster WebSocket connected to room:", roomCode);
        setSignalingState("connected");
        setSignalingError(null);

        ws.send(
          JSON.stringify({
            type: "join",
            role: "broadcaster",
            room: roomCode,
          })
        );

        // Ping heartbeat every 10s to keep connection open
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", room: roomCode }));
          }
        }, 10000);

        // Send offer immediately
        sendOffer("default-pc");
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, payload } = msg;

          if (type === "peer-joined") {
            console.log("Receiver joined room, sending offer...");
            sendOffer(payload?.peerId || "default-pc");
          } else if (type === "answer") {
            const pc = peerConnectionsRef.current.get(payload.peerId || "default-pc");
            if (pc && pc.signalingState !== "closed") {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
          } else if (type === "ice-candidate") {
            const pc = peerConnectionsRef.current.get(payload.peerId || "default-pc");
            if (pc && payload.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch((e) => console.warn(e));
            }
          } else if (type === "remote-cmd" && onRemoteCommand) {
            onRemoteCommand(payload);
          }
        } catch (e) {
          console.error("Broadcaster error processing signaling message:", e);
        }
      };

      ws.onerror = (err) => {
        console.warn("Broadcaster WebSocket error:", err);
        setSignalingState("error");
        setSignalingError(`Não foi possível conectar ao IP do PC (${wsUrl}). Verifique se o servidor está aberto no PC e no mesmo Wi-Fi.`);
      };

      ws.onclose = () => {
        console.log("Broadcaster WebSocket disconnected");
        setSignalingState("disconnected");
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };
    } catch (err: any) {
      setSignalingState("error");
      setSignalingError(err?.message || "Erro ao conectar ao IP do PC");
    }
  }, [getTargetWsUrl, roomCode, sendOffer, onRemoteCommand]);

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
      wsRef.current.close();
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
    stats,
    startBroadcast,
    stopBroadcast,
    connectSignaling,
    roomCode,
    resolvedWsUrl: getTargetWsUrl(),
  };
}
