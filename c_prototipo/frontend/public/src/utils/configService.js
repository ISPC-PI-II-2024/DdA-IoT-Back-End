// ==========================
// Servicio para manejo de configuración
// - Sincronización entre localStorage y API
// - Cache de configuración
// - Validaciones
// - Configuraciones por perfil de usuario
// ==========================
import { ConfigAPI } from "../api.js";
import { getState } from "../state/store.js";

const CONFIG_KEYS = {
  VISUALIZATION: "visualization_config",
  ADVANCED: "advanced_config",
  NOTIFICATIONS: "notification_config",
  USER_PREFERENCES: "user_preferences"
};

// Clave mínima para intervalo de actualización de gráficos (15 segundos)
const MIN_CHART_REFRESH_INTERVAL = 15000;

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  // Obtener clave única para el perfil del usuario actual
  getUserConfigKey(baseKey) {
    const state = getState();
    const userId = state.user?.email || state.user?.name || 'guest';
    return `${baseKey}_${userId}`;
  }

  // === Eventos ===
  onConfigChange(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(callback);
      }
    };
  }

  emitChange(key, value) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error("Error en listener de configuración:", error);
        }
      });
    }
  }

  // === Operaciones básicas ===
  /* eslint-disable no-undef */
  get(key, fallback = null, useUserProfile = false) {
    try {
      // Si usa perfil de usuario, obtener clave única
      const storageKey = useUserProfile ? this.getUserConfigKey(key) : key;
      
      // Primero buscar en cache
      if (this.cache.has(storageKey)) {
        return this.cache.get(storageKey);
      }

      // Luego buscar en localStorage
      const raw = localStorage.getItem(storageKey);
      const config = raw ? JSON.parse(raw) : fallback;
      
      // Guardar en cache
      this.cache.set(storageKey, config);
      return config;
    } catch (error) {
      console.error(`Error leyendo configuración ${key}:`, error);
      return fallback;
    }
  }

  set(key, value, useUserProfile = false) {
    try {
      // Si usa perfil de usuario, obtener clave única
      const storageKey = useUserProfile ? this.getUserConfigKey(key) : key;
      
      // Guardar en localStorage
      localStorage.setItem(storageKey, JSON.stringify(value));
      
      // Actualizar cache
      this.cache.set(storageKey, value);
      
      // Notificar cambios
      this.emitChange(key, value);
      
      return true;
    } catch (error) {
      console.error(`Error guardando configuración ${key}:`, error);
      return false;
    }
  }

  remove(key, useUserProfile = false) {
    try {
      const storageKey = useUserProfile ? this.getUserConfigKey(key) : key;
      localStorage.removeItem(storageKey);
      this.cache.delete(storageKey);
      this.emitChange(key, null);
      return true;
    } catch (error) {
      console.error(`Error removiendo configuración ${key}:`, error);
      return false;
    }
  }

  // === Configuraciones específicas ===
  getVisualizationConfig() {
    const config = this.get(CONFIG_KEYS.VISUALIZATION, {
      temperatureUnit: "celsius",
      chartRefresh: MIN_CHART_REFRESH_INTERVAL, // Mínimo 15 segundos por defecto
      chartPoints: 60
    }, true); // Usar perfil de usuario
    
    // Asegurar que chartRefresh nunca sea menor al mínimo
    if (config.chartRefresh < MIN_CHART_REFRESH_INTERVAL) {
      config.chartRefresh = MIN_CHART_REFRESH_INTERVAL;
      // Actualizar automáticamente si estaba por debajo del mínimo
      this.setVisualizationConfig(config);
    }
    
    return config;
  }

  setVisualizationConfig(config) {
    // Validar que chartRefresh sea al menos el mínimo requerido
    if (config.chartRefresh !== undefined && config.chartRefresh < MIN_CHART_REFRESH_INTERVAL) {
      console.warn(`chartRefresh debe ser al menos ${MIN_CHART_REFRESH_INTERVAL}ms (15s). Ajustando automáticamente.`);
      config.chartRefresh = MIN_CHART_REFRESH_INTERVAL;
    }
    
    return this.set(CONFIG_KEYS.VISUALIZATION, config, true); // Guardar por perfil de usuario
  }

  getAdvancedConfig() {
    return this.get(CONFIG_KEYS.ADVANCED, {
      thresholds: {
        tempMin: 15.0,
        tempMax: 30.0,
        tempCriticalMin: 5.0,
        tempCriticalMax: 40.0,
        humidityMin: 30.0,
        humidityMax: 80.0,
        batteryLow: 20.0,
        co2NormalMax: 1000,
        co2Warning: 1500,
        co2Critical: 2000,
        enableTempAlerts: true,
        enableHumidityAlerts: true,
        enableBatteryAlerts: true,
        enableCO2Alerts: true
      },
      charts: {
        updateInterval: 1000,
        dataPoints: 60,
        autoScale: true,
        realTime: true
      },
      mqtt: {
        topics: ["vittoriodurigutti/prueba", "vittoriodurigutti/temperature"],
        qosLevel: 1,
        timeout: 30000
      },
      notifications: {
        email: "",
        cooldown: 5,
        logging: false,
        debugMode: false
      }
    });
  }

  async setAdvancesConfig(config) {
    // Guardar localmente (esto dispara emitChange automáticamente)
    const localSuccess = this.set(CONFIG_KEYS.ADVANCED, config);
    
    // Si el usuario es admin, sincronizar con servidor
    try {
      await ConfigAPI.updateAdvancedConfig(config);
      console.log("Configuración avanzada sincronizada con servidor");
    } catch (error) {
      console.warn("No se pudo sincronizar configuración avanzada:", error);
      // La configuración local se mantiene aunque falle la sincronización
    }
    
    // Disparar evento personalizado para componentes que no usan onConfigChange
    window.dispatchEvent(new CustomEvent('advancedConfigChanged', { detail: config }));
    
    return localSuccess;
  }

  getNotificationConfig() {
    return this.get(CONFIG_KEYS.NOTIFICATIONS, {
      browserNotifications: false,
      soundAlerts: false
    }, true); // Usar perfil de usuario
  }

  setNotificationConfig(config) {
    return this.set(CONFIG_KEYS.NOTIFICATIONS, config, true); // Guardar por perfil de usuario
  }

  // === Sincronización con servidor ===
  async loadFromServer(configType = "general") {
    try {
      let response;
      
      if (configType === "advanced") {
        response = await ConfigAPI.getAdvancedConfig();
      } else {
        response = await ConfigAPI.getGeneralConfig();
      }
      
      if (response.success) {
        return response.config;
      }
      
      throw new Error("Respuesta del servidor inválida");
    } catch (error) {
      console.error(`Error cargando configuración ${configType}:`, error);
      throw error;
    }
  }

  // === Utilidades ===
  exportConfig() {
    const exportData = {};
    
    // Exportar todas las configuraciones
    Object.values(CONFIG_KEYS).forEach(key => {
      exportData[key] = this.get(key);
    });
    
    exportData.metadata = {
      exportDate: new Date().toISOString(),
      version: "1.0.0"
    };
    
    return exportData;
  }

  importConfig(configData) {
    try {
      // Validar estructura
      if (!this.validateConfigStructure(configData)) {
        throw new Error("Estructura de configuración inválida");
      }
      
      // Importar cada configuración
      Object.entries(configData).forEach(([key, value]) => {
        if (key !== "metadata" && value !== null) {
          this.set(key, value);
        }
      });
      
      console.log("Configuración importada exitosamente");
      return true;
    } catch (error) {
      console.error("Error importando configuración:", error);
      return false;
    }
  }

  validateConfigStructure(configData) {
    // Validación básica de estructura
    return configData && typeof configData === "object";
  }

  // === Reseteo ===
  resetAll() {
    Object.values(CONFIG_KEYS).forEach(key => {
      this.remove(key);
    });
    console.log("Toda la configuración ha sido reseteada");
  }

  resetConfig(key) {
    if (CONFIG_KEYS.hasOwnProperty(key)) {
      this.remove(CONFIG_KEYS[key]);
      return true;
    }
    return false;
  }

  // === Limpieza de cache ===
  /**
   * Limpia el cache en memoria (mantiene localStorage)
   * Útil para liberar memoria cuando se cambia de página
   */
  clearCache() {
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(`[ConfigService] Cache limpiado: ${cacheSize} entradas removidas`);
    return cacheSize;
  }

  /**
   * Limpia listeners específicos de una clave
   * @param {string} key - Clave de configuración
   */
  clearListeners(key) {
    if (this.listeners.has(key)) {
      this.listeners.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Limpia todos los listeners
   */
  clearAllListeners() {
    const listenersCount = this.listeners.size;
    this.listeners.clear();
    console.log(`[ConfigService] Listeners limpiados: ${listenersCount} sets removidos`);
    return listenersCount;
  }

  // === Estado ===
  getStatus() {
    const status = {
      localStorage: typeof Storage !== "undefined",
      cacheSize: this.cache.size,
      listeners: this.listeners.size,
      configurations: {}
    };
    
    Object.entries(CONFIG_KEYS).forEach(([name, key]) => {
      status.configurations[name] = !!this.get(key);
    });
    
    return status;
  }
}

// Exportar instancia singleton
export const configService = new ConfigService();
export { CONFIG_KEYS };
