import express from "express";
import http from "http";
import path from "path";
import os from "os";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  // Enable CORS for all origins (vital for standalone APK / Capacitor apps connecting to PC IP)
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // Helper to discover local IP addresses (LAN / Wi-Fi)
  function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses: { name: string; ip: string; internal: boolean; family: string }[] = [];
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (netInterface) {
        for (const item of netInterface) {
          if (item.family === "IPv4") {
            addresses.push({
              name,
              ip: item.address,
              internal: item.internal,
              family: item.family,
            });
          }
        }
      }
    }
    return addresses;
  }

  // API Routes for PC Connection, Health & Network Diagnostics
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: Date.now(),
      hostname: os.hostname(),
      platform: os.platform(),
      clientIp: req.ip || req.socket.remoteAddress,
      activeClients: clients.size,
    });
  });

  app.get("/api/ping", (_req, res) => {
    res.json({
      status: "pong",
      timestamp: Date.now(),
      server: "Larix Broadcaster Studio Engine",
    });
  });

  app.get("/api/network-info", (_req, res) => {
    const ips = getLocalIpAddresses();
    const nonInternal = ips.filter((item) => !item.internal && !item.ip.startsWith("127."));
    const primaryLan = nonInternal.length > 0 ? nonInternal[0] : null;

    res.json({
      port: PORT,
      interfaces: ips,
      primaryIp: primaryLan ? primaryLan.ip : (ips[0]?.ip || "127.0.0.1"),
      allIps: ips.map((i) => ({ name: i.name, ip: i.ip, isVirtual: i.internal })),
      hostname: os.hostname(),
    });
  });

  // Setup WebSocket Signaling Server for WebRTC P2P (Broadcaster <-> Receiver)
  const wss = new WebSocketServer({ server, path: "/ws" });

  interface ClientMeta {
    ws: WebSocket;
    role: "broadcaster" | "receiver";
    room: string;
  }

  const clients = new Map<WebSocket, ClientMeta>();

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (rawMessage: string) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        const { type, room, role, payload } = data;

        if (type === "join") {
          clients.set(ws, { ws, role: role || "receiver", room: room || "default" });
          
          // Notify broadcaster if a receiver joined or vice versa
          broadcastToRoom(room || "default", ws, {
            type: "peer-joined",
            role: role || "receiver",
            totalPeers: getPeersInRoom(room || "default").length,
          });
          return;
        }

        const currentClient = clients.get(ws);
        const targetRoom = room || currentClient?.room || "default";

        // Route signaling messages (SDP offer/answer, ICE candidates, Remote control commands)
        if (
          type === "offer" ||
          type === "answer" ||
          type === "ice-candidate" ||
          type === "remote-cmd" ||
          type === "status-sync" ||
          type === "ping"
        ) {
          broadcastToRoom(targetRoom, ws, {
            type,
            payload,
            fromRole: currentClient?.role,
          });
        }
      } catch (err) {
        console.error("Signaling message error:", err);
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        clients.delete(ws);
        broadcastToRoom(client.room, ws, {
          type: "peer-left",
          role: client.role,
        });
      }
    });
  });

  function getPeersInRoom(room: string) {
    const list: ClientMeta[] = [];
    for (const c of clients.values()) {
      if (c.room === room) list.push(c);
    }
    return list;
  }

  function broadcastToRoom(room: string, senderWs: WebSocket, message: any) {
    const raw = JSON.stringify(message);
    for (const [ws, meta] of clients.entries()) {
      if (meta.room === room && ws !== senderWs && ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Larix Broadcaster Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
