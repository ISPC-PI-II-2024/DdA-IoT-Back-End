// ==========================
// WebSocket Client Wrapper
// - Autenticación: token en querystring (?token=)
// - Reintentos con backoff exponencial + jitter
// - API: connect(), subscribe(topic, fn), unsubscribe(topic), close()
// - Emite mensajes {topic, ts, payload} desde el backend
// ==========================
import { storage } from "./utils/storage.js";

const CFG = () => window.__CONFIG || {};
const TOKEN_KEY = "auth_token";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export class RTClient {
  constructor() {
    this.ws = null;
    this.handlers = new Map(); // topic -> Set<fn>
    this.url = null;
    this.closing = false;
    this.backoff = { base: 500, max: 8000, factor: 2 };
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  onMessage(ev) {
    try {
      const data = JSON.parse(ev.data);
      if (data?.topic) {
        // Procesar alertas si el servicio está disponible
        if (window.alertService) {
          this.processAlerts(data);
        }
        
        const set = this.handlers.get(data.topic);
        if (set) set.forEach(fn => {
          try {
            fn(data);
          } catch (error) {
            console.error(`Error en handler para tópico ${data.topic}:`, error);
          }
        });
      }
    } catch (error) {
      console.error("Error parseando mensaje WebSocket:", error);
    }
  }

  processAlerts(data) {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      if (!window.alertService) return;
      
      const payload = data.payload;
      if (!payload) return;

      // Verificar temperatura
      if (payload.temperature !== undefined) {
        window.alertService.checkTemperature(payload.temperature);
      }

      // Verificar humedad
      if (payload.humidity !== undefined) {
        window.alertService.checkHumidity(payload.humidity);
      }

      // Verificar CO2
      if (payload.co2 !== undefined || payload.CO2 !== undefined) {
        window.alertService.checkCO2(payload.co2 || payload.CO2);
      }
    } catch (error) {
      console.warn("[WS] Error procesando alertas:", error);
    }
  }

  async connect() {
    if (this.isConnecting) return; // Evitar múltiples intentos simultáneos
    this.isConnecting = true;
    
    this.closing = false;
    const token = storage.get(TOKEN_KEY, null, true);
    if (!token) {
      console.error("WebSocket: Sin token de autenticación");
      this.isConnecting = false;
      throw new Error("Sin token: inicie sesión");
    }

    const base = CFG().WS_URL; // ej: ws://localhost:5000/ws
    this.url = `${base}?token=${encodeURIComponent(token)}`;

    let attempt = 0;
    while (!this.closing && attempt < this.maxReconnectAttempts) {
      try {
        await this._connectOnce();
        this.reconnectAttempts = 0; // Reset contador al conectar exitosamente
        this.isConnecting = false;
        return;
      } catch (e) {
        attempt++;
        this.reconnectAttempts++;
        console.warn(`WebSocket intento ${attempt}/${this.maxReconnectAttempts}:`, e.message || e);
        
        if (attempt >= this.maxReconnectAttempts) {
          console.error("WebSocket: Máximo de intentos alcanzado");
          this.isConnecting = false;
          return;
        }
        
        const delay = Math.min(this.backoff.base * Math.pow(this.backoff.factor, attempt), this.backoff.max);
        const jitter = Math.random() * 150;
        await sleep(delay + jitter);
      }
    }
    
    this.isConnecting = false;
  }

  _connectOnce() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onmessage = (ev) => this.onMessage(ev);
      ws.onclose = () => {
        this.ws = null;
        if (!this.closing && this.reconnectAttempts < this.maxReconnectAttempts) {
          // Reconectar solo si no hemos excedido el límite
          setTimeout(() => this.connect(), 1000);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error("WebSocket: Deteniendo reconexión por límite de intentos");
        }
      };
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        try { ws.close(); } catch {}
        reject(err);
      };
    });
  }

  subscribe(topic, fn) {
    if (!this.handlers.has(topic)) this.handlers.set(topic, new Set());
    this.handlers.get(topic).add(fn);
    // Enviar sub al server
    this._send({ type: "sub", topic });
    // Retorna unsubscribe de conveniencia
    return () => this.unsubscribe(topic, fn);
  }

  unsubscribe(topic, fn) {
    const set = this.handlers.get(topic);
    if (set) {
      set.delete(fn);
      if (set.size === 0) this.handlers.delete(topic);
    }
    this._send({ type: "unsub", topic });
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  async close() {
    this.closing = true;
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }
}

// Singleton simple para la app
export const rtClient = new RTClient();
