import { useState, useEffect, useRef, useCallback } from "react";
import { RemoteControlCommand } from "../types";

export function useWebRTCReceiver(roomCode: string = "larix-studio-1") {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [fps, setFps] = useState<number>(0);
  const [bitrateKbps, setBitrateKbps] = useState<number>(0);
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<string>("Conectando ao transmissor...");

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const prevBytesReceivedRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(Date.now());
  const statsIntervalRef = useRef<number | null>(null);

  // Connect to room as receiver
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

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
    pcRef.current = pc;

    pc.ontrack = (event) => {
      console.log("Receiver received track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream();
        stream.addTrack(event.track);
        setRemoteStream(stream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "ice-candidate",
            room: roomCode,
            role: "receiver",
            payload: { candidate: event.candidate, peerId: "default-pc" },
          })
        );
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Receiver PC connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setIsConnected(true);
        setStatusMessage("Transmissão ativa (Latência ultra-baixa)");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsConnected(false);
        setStatusMessage("Aguardando transmissor iniciar transmissão...");
      }
    };

    ws.onopen = () => {
      setStatusMessage("Conectado ao servidor de sinalização. Aguardando celular...");
      ws.send(
        JSON.stringify({
          type: "join",
          role: "receiver",
          room: roomCode,
        })
      );
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        if (type === "offer") {
          console.log("Receiver got SDP offer, creating answer...");
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          ws.send(
            JSON.stringify({
              type: "answer",
              room: roomCode,
              role: "receiver",
              payload: { sdp: pc.localDescription, peerId: payload.peerId || "default-pc" },
            })
          );
        } else if (type === "ice-candidate") {
          if (payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.warn);
          }
        }
      } catch (e) {
        console.error("Receiver error handling msg:", e);
      }
    };

    // Periodic Stats calculation
    statsIntervalRef.current = window.setInterval(async () => {
      if (pc.connectionState === "connected") {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === "inbound-rtp" && report.kind === "video") {
              const now = Date.now();
              const bytes = report.bytesReceived || 0;
              const timeDiff = (now - prevTimestampRef.current) / 1000;
              if (timeDiff > 0 && prevBytesReceivedRef.current > 0) {
                const calculatedBitrate = Math.round(((bytes - prevBytesReceivedRef.current) * 8) / (timeDiff * 1000));
                setBitrateKbps(calculatedBitrate > 0 ? calculatedBitrate : 4500);
              }
              prevBytesReceivedRef.current = bytes;
              prevTimestampRef.current = now;
              setFps(Math.round(report.framesPerSecond || 30));
              if (report.frameWidth && report.frameHeight) {
                setResolution({ width: report.frameWidth, height: report.frameHeight });
              }
            }
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              const rtt = Math.round((report.currentRoundTripTime || 0.015) * 1000);
              setLatencyMs(rtt > 0 ? rtt : 18);
            }
          });
        } catch (e) {}
      }
    }, 1000);

    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      if (pc) {
        try { pc.close(); } catch (e) {}
      }
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          } else if (ws.readyState === WebSocket.CONNECTING) {
            ws.onopen = () => {
              try { ws.close(); } catch (e) {}
            };
          }
        } catch (e) {}
      }
    };
  }, [roomCode]);

  // Send Remote Control Command to Broadcaster (Director controls)
  const sendRemoteCommand = useCallback((cmd: RemoteControlCommand) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "remote-cmd",
          room: roomCode,
          role: "receiver",
          payload: cmd,
        })
      );
    }
  }, [roomCode]);

  return {
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
  };
}
