// ==========================
// Wrapper de fetch + helpers de Auth
// ==========================
import { storage } from "./utils/storage.js";
import { setState, ROLES_CONST } from "./state/store.js";

const CFG = () => window.__CONFIG || {};
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const ROLE_KEY = "auth_role";

export function getToken() {
  return storage.get(TOKEN_KEY);
}
export function setSession({ accessToken, user, role }) {
  storage.set(TOKEN_KEY, accessToken, true); // sessionStorage
  storage.set(USER_KEY, user, true);
  storage.set(ROLE_KEY, role, true);
  setState({ user, role });
}
export function clearSession() {
  storage.del(TOKEN_KEY, true);
  storage.del(USER_KEY, true);
  storage.del(ROLE_KEY, true);
  // También limpiar localStorage por seguridad
  storage.del(TOKEN_KEY, false);
  storage.del(USER_KEY, false);
  storage.del(ROLE_KEY, false);
  setState({ user: null, role: ROLES_CONST.GUEST, currentProject: null });
}

// Inicializar sesión desde storage al cargar la app
export async function initSession() {
  const token = getToken();
  const storedUser = storage.get(USER_KEY, null, true);
  const storedRole = storage.get(ROLE_KEY, null, true);
  
  if (token && storedUser && storedRole) {
    try {
      // Verificar que el token sigue siendo válido consultando algún endpoint
      // Por simplicidad, intentamos hacer una request autenticada
      await request("/config/general", { auth: true });
      // Si no lanza error, el token es válido, restaurar sesión
      setSession({ accessToken: token, user: storedUser, role: storedRole });
      return true;
    } catch (error) {
      // Token inválido, limpiar sesión
      clearSession();
      return false;
    }
  }
  return false;
}

// Rate limiting simple con cache compartido
const requestQueue = new Map(); // path -> { lastRequest, count }
const responseCache = new Map(); // path -> { data, timestamp, ttl }

// Limpiar cache automáticamente cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of responseCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      responseCache.delete(key);
    }
  }
}, 300000); // 5 minutos

async function request(path, { method = "GET", body, auth = false, cache = false, cacheTTL = 30000 } = {}) {
  // Para GET requests, verificar cache primero si está habilitado
  if (method === "GET" && cache) {
    const cacheKey = `${method}:${path}`;
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return Promise.resolve(cached.data);
    }
  }

  // Rate limiting - máximo 2 requests por segundo por endpoint
  const now = Date.now();
  const queueKey = `${method}:${path}`;
  const lastRequest = requestQueue.get(queueKey);
  
  if (lastRequest && now - lastRequest.lastRequest < 500) { // 500ms = 2 por segundo
    lastRequest.count++;
    if (lastRequest.count > 5) { // Aumentar límite a 5
      console.warn(`[RATE-LIMIT] demasiadas requests a ${path}`);
      // En lugar de rechazar, esperar un poco
      await new Promise(resolve => setTimeout(resolve, 500));
      // Resetear contador después de esperar
      requestQueue.set(queueKey, { lastRequest: Date.now(), count: 1 });
    }
  } else {
    requestQueue.set(queueKey, { lastRequest: now, count: 1 });
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const url = `${CFG().API_URL}${path}`;
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined
    });
    
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      console.error(`[API-ERROR] [${res.status}]:`, path, data);
      throw Object.assign(new Error("API error"), { status: res.status, data });
    }
    
    // Guardar en cache si está habilitado y es GET
    if (method === "GET" && cache) {
      const cacheKey = `${method}:${path}`;
      responseCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      });
    }
    
    return data;
  } catch (error) {
    console.error(`[ERROR] Request failed to ${path}:`, error);
    throw error;
  }
}

// === Endpoints ===
export const AuthAPI = {
  googleLogin(credential) {
    return request("/auth/google", { method: "POST", body: { credential } });
  }
};

export const ConfigAPI = {
  // Configuración general - todos los autenticados
  getGeneralConfig() {
    return request("/config/general", { auth: true });
  },
  
  // Configuración avanzada - solo admin
  getAdvancedConfig() {
    return request("/config/advanced", { auth: true });
  },
  
  updateAdvancedConfig(config) {
    return request("/config/advanced", { method: "PUT", body: { config }, auth: true });
  },
  
  // Administración
  getMQTTStatus() {
    return request("/config/mqtt/status", { auth: true });
  },
  
  getMQTTTopics() {
    return request("/config/mqtt/topics", { auth: true });
  },
  
  restartMQTTConnection() {
    return request("/config/mqtt/restart", { method: "POST", auth: true });
  },
  
  reloadMQTTTopics() {
    return request("/config/mqtt/reload-topics", { method: "POST", auth: true });
  },
  
  clearDataCache() {
    return request("/config/cache/clear", { method: "POST", auth: true });
  },

  // CRUD de tópicos MQTT (solo admin)
  createMQTTTopic(topicData) {
    return request("/config/mqtt/topics", { method: "POST", body: topicData, auth: true });
  },

  updateMQTTTopic(topicId, topicData) {
    return request(`/config/mqtt/topics/${topicId}`, { method: "PUT", body: topicData, auth: true });
  },

  deleteMQTTTopic(topicId) {
    return request(`/config/mqtt/topics/${topicId}`, { method: "DELETE", auth: true });
  }
};

export const DevicesAPI = {
  // Obtener todos los dispositivos disponibles
  getAllDevices() {
    return request("/devices", { auth: true });
  },
  
  // Obtener información detallada de un dispositivo específico
  getDeviceById(deviceId) {
    return request(`/devices/${deviceId}`, { auth: true });
  },
  
  // Obtener datos de sensores de un dispositivo específico
  getDeviceSensorData(deviceId, limit = 100) {
    return request(`/devices/${deviceId}/sensor-data?limit=${limit}`, { auth: true });
  },

  // Obtener datos históricos de InfluxDB para un dispositivo
  getHistoricalData(deviceId, limit = 100, timeRange = "24h") {
    return request(`/devices/${deviceId}/historical?limit=${limit}&timeRange=${timeRange}`, { auth: true });
  }
};

export const GatewayAPI = {
  // Obtener todos los gateways
  getAllGateways() {
    return request("/gateways", { auth: true });
  },
  
  // Obtener gateway específico con sus endpoints
  getGatewayById(gatewayId) {
    return request(`/gateways/${gatewayId}`, { auth: true });
  },
  
  // Obtener todos los endpoints
  getAllEndpoints() {
    return request("/endpoints", { auth: true });
  },
  
  // Obtener endpoint específico con sus sensores
  getEndpointById(endpointId) {
    return request(`/endpoints/${endpointId}`, { auth: true });
  },
  
  // Obtener todos los sensores
  getAllSensors() {
    return request("/sensors", { auth: true });
  },
  
  // Obtener sensor específico
  getSensorById(sensorId) {
    return request(`/sensors/${sensorId}`, { auth: true });
  },
  
  // Obtener sensores por endpoint
  getSensorsByEndpoint(endpointId) {
    return request(`/endpoints/${endpointId}/sensors`, { auth: true });
  },
  
  // Obtener estado completo del sistema
  getSystemStatus() {
    // Usar cache de 5 segundos para evitar rate limits cuando múltiples widgets lo llaman
    return request("/status", { auth: true, cache: true, cacheTTL: 5000 });
  },
  
  // Obtener umbrales actuales
  getThresholds() {
    return request("/thresholds", { auth: true });
  },
  
  // Actualizar umbrales (solo admin)
  updateThresholds(thresholds) {
    return request("/thresholds", { method: "PUT", body: { thresholds }, auth: true });
  }
};