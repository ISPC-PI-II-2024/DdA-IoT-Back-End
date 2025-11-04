// ==========================
// WebSocket Server (WS) con JWT
// - Handshake por querystring ?token= (simple para prototipo)
// - Pub/Sub por tópico
// - Keepalive con ping/pong
// - Integración con MQTT para datos de temperatura en tiempo real
// ==========================
import { WebSocketServer } from "ws";
import { verifyAccessToken } from "../service/jwt.service.js";
import { mqttService } from "../service/mqtt.service.js";
import { createServer } from "http";
import url from "url";

/** Estructuras de suscripción */
const topics = new Map();          // topic -> Set<ws>
const subsByClient = new WeakMap(); // ws -> Set<topic>

/** Helpers de pub/sub */
function sub(ws, topic) {
  if (!topics.has(topic)) topics.set(topic, new Set());
  topics.get(topic).add(ws);
  if (!subsByClient.has(ws)) subsByClient.set(ws, new Set());
  subsByClient.get(ws).add(topic);
}

function unsub(ws, topic) {
  topics.get(topic)?.delete(ws);
  subsByClient.get(ws)?.delete(topic);
}

function unsubAll(ws) {
  const subs = subsByClient.get(ws);
  if (!subs) return;
  subs.forEach(t => topics.get(t)?.delete(ws));
  subsByClient.delete(ws);
}

/** Broadcast a un tópico: { topic, ts, payload } */
export function publish(topic, payload) {
  const message = JSON.stringify({ topic, ts: Date.now(), payload });
  topics.get(topic)?.forEach(ws => {
    if (ws.readyState === ws.OPEN) ws.send(message);
  });
}

/** Inicio de WebSocketServer sobre un HTTP server existente */
export function initWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // autenticar token del querystring (?token=)
  httpServer.on("upgrade", async (req, socket, head) => {
    const { pathname, query } = url.parse(req.url, true);
    if (pathname !== "/ws") return; // no manejamos otros paths aquí

    const token = query?.token;
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const payload = await verifyAccessToken(token); // {email, role, ...}
      // Handshake OK → promover a WS
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.user = { email: payload.email, role: payload.role, name: payload.name };
        wss.emit("connection", ws, req);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  // Conexión WS
  wss.on("connection", (ws) => {
    // Marca de vida para ping/pong
    ws.isAlive = true;
    ws.on("pong", () => (ws.isAlive = true));

    // Suscripción por defecto a datos de temperatura
    sub(ws, "temperature");
    
    // Registrar en MQTT service para broadcasting
    mqttService.addSubscriber(ws);

    ws.on("message", (raw) => {
      let msg = null;
      try { msg = JSON.parse(raw); } catch { /* ignore */ }
      if (!msg || typeof msg !== "object") return;

      // Protocolo simple:
      // { type: "sub", topic }
      // { type: "unsub", topic }
      // { type: "ping" }
      switch (msg.type) {
        case "sub":
          if (typeof msg.topic === "string") sub(ws, msg.topic);
          break;
        case "unsub":
          if (typeof msg.topic === "string") unsub(ws, msg.topic);
          break;
        case "ping":
          ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
          break;
      }
    });

    ws.on("close", () => {
      unsubAll(ws);
      mqttService.removeSubscriber(ws);
    });
  });

  // Keepalive (cada 30s)
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  // ======= Demo feed: publica un valor seno cada 1s en "metrics/demo" =======
  // Mantenido para compatibilidad, pero ahora también tenemos datos reales de MQTT
  
  let t = 0;
  setInterval(() => {
    const value = Math.sin(t / 10) * 50 + 50 + Math.random() * 5; // 0..~105
    publish("metricas/demo", { value });
    t++;
  }, 1000);

  return wss;
}
