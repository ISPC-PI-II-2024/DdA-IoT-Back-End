// ==========================
// Servicio de Cache para optimizar consultas al backend
// Evita consultas repetidas y mejora el rendimiento
// ==========================

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto
  }

  /**
   * Obtiene un valor del cache
   * @param {string} key - Clave del cache
   * @returns {any} Valor cacheado o null si no existe/expirado
   */
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return null;

    const now = Date.now();
    const ttl = this.getTTL(key);
    
    if (now - timestamp > ttl) {
      this.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Almacena un valor en el cache
   * @param {string} key - Clave del cache
   * @param {any} value - Valor a cachear
   * @param {number} ttl - Tiempo de vida en ms (opcional)
   */
  set(key, value, ttl = null) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    
    if (ttl) {
      this.setTTL(key, ttl);
    }
  }

  /**
   * Elimina un valor del cache
   * @param {string} key - Clave del cache
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.ttlMap?.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.ttlMap?.clear();
  }

  /**
   * Verifica si una clave existe en el cache
   * @param {string} key - Clave del cache
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Obtiene el TTL personalizado para una clave
   * @param {string} key - Clave del cache
   * @returns {number} TTL en ms
   */
  getTTL(key) {
    return this.ttlMap?.get(key) || this.defaultTTL;
  }

  /**
   * Establece un TTL personalizado para una clave
   * @param {string} key - Clave del cache
   * @param {number} ttl - TTL en ms
   */
  setTTL(key, ttl) {
    if (!this.ttlMap) {
      this.ttlMap = new Map();
    }
    this.ttlMap.set(key, ttl);
  }

  /**
   * Obtiene estadísticas del cache
   * @returns {Object} Estadísticas del cache
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, timestamp] of this.timestamps) {
      const ttl = this.getTTL(key);
      if (now - timestamp > ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estima el uso de memoria del cache
   * @returns {number} Uso estimado en bytes
   */
  estimateMemoryUsage() {
    let size = 0;
    for (const [key, value] of this.cache) {
      size += key.length * 2; // Unicode chars
      size += JSON.stringify(value).length * 2;
    }
    return size;
  }

  /**
   * Limpia entradas expiradas del cache
   * @returns {number} Número de entradas eliminadas
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, timestamp] of this.timestamps) {
      const ttl = this.getTTL(key);
      if (now - timestamp > ttl) {
        this.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Instancia singleton
export const cacheService = new CacheService();

// Limpiar cache automáticamente cada 10 minutos
setInterval(() => {
  const removed = cacheService.cleanup();
  if (removed > 0) {
    console.log(`🧹 Cache cleanup: removed ${removed} expired entries`);
  }
}, 10 * 60 * 1000);

// Claves de cache predefinidas
export const CACHE_KEYS = {
  DEVICES: 'devices',
  DEVICE_DETAILS: 'device_details',
  DEVICE_SENSOR_DATA: 'device_sensor_data',
  DEVICE_STATS: 'device_stats',
  MQTT_TOPICS: 'mqtt_topics',
  SYSTEM_CONFIG: 'system_config',
  USER_INFO: 'user_info'
};

// TTLs predefinidos (en ms)
export const CACHE_TTL = {
  DEVICES: 10 * 60 * 1000,        // 10 minutos
  DEVICE_DETAILS: 5 * 60 * 1000,  // 5 minutos
  DEVICE_SENSOR_DATA: 2 * 60 * 1000, // 2 minutos
  DEVICE_STATS: 5 * 60 * 1000,    // 5 minutos
  MQTT_TOPICS: 15 * 60 * 1000,    // 15 minutos
  SYSTEM_CONFIG: 30 * 60 * 1000,  // 30 minutos
  USER_INFO: 60 * 60 * 1000       // 1 hora
};
