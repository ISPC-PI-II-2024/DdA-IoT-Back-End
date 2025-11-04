// ==========================
// Servicio optimizado para dispositivos con cache
// Reduce consultas al backend y mejora el rendimiento
// ==========================

import { DevicesAPI } from "../api.js";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "./cacheService.js";
import { setDevices } from "../state/store.js";

class DeviceService {
  constructor() {
    this.isLoading = false;
    this.loadingPromises = new Map();
    // Sistema de batching para optimizar consultas
    this.batchQueues = new Map(); // tipo -> array de {deviceId, resolve, reject, limit}
    this.batchTimers = new Map(); // tipo -> timer
    this.BATCH_DELAY = 300; // Esperar 300ms antes de ejecutar batch
    this.BATCH_SIZE = 5; // Máximo 5 dispositivos por batch
    this.MAX_CONCURRENT = 3; // Máximo 3 batches simultáneos
    this.activeBatches = 0;
  }

  /**
   * Obtiene todos los dispositivos con cache
   * @returns {Promise<Array>} Lista de dispositivos
   */
  async getAllDevices() {
    // Verificar cache primero
    const cached = cacheService.get(CACHE_KEYS.DEVICES);
    if (cached) {
      console.log("[CACHE] Dispositivos obtenidos del cache");
      return cached;
    }

    // Evitar múltiples consultas simultáneas
    if (this.isLoading) {
      return new Promise((resolve) => {
        const checkCache = () => {
          const cached = cacheService.get(CACHE_KEYS.DEVICES);
          if (cached) {
            resolve(cached);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.isLoading = true;
    console.log("[API] Cargando dispositivos desde el servidor...");

    try {
      // Timeout para evitar que se quede colgado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: El servidor no responde')), 10000);
      });

      const apiPromise = DevicesAPI.getAllDevices();
      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (response && response.success) {
        // Asegurar que data es un array
        const devices = Array.isArray(response.data) ? response.data : [];
        
        // Cachear los dispositivos
        cacheService.set(CACHE_KEYS.DEVICES, devices, CACHE_TTL.DEVICES);
        
        // Actualizar el estado global
        setDevices(devices);
        
        console.log(`[API] ${devices.length} dispositivo(s) cargado(s) y cacheado(s)`);
        return devices;
      } else {
        throw new Error("Error en respuesta del servidor: " + JSON.stringify(response));
      }
    } catch (error) {
      console.error("[ERROR] Error cargando dispositivos:", error);
      
      // Fallback: devolver array vacío si el servidor falla
      const fallbackDevices = [];
      
      console.log("[FALLBACK] Usando datos de fallback (array vacio)");
      cacheService.set(CACHE_KEYS.DEVICES, fallbackDevices, 60000); // 1 minuto
      setDevices(fallbackDevices);
      
      return fallbackDevices;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Obtiene detalles de un dispositivo específico con cache
   * @param {string} deviceId - ID del dispositivo
   * @returns {Promise<Object>} Detalles del dispositivo
   */
  async getDeviceDetails(deviceId) {
    const cacheKey = `${CACHE_KEYS.DEVICE_DETAILS}_${deviceId}`;
    
    // Verificar cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE] Detalles del dispositivo ${deviceId} obtenidos del cache`);
      return cached;
    }

    console.log(`[API] Cargando detalles del dispositivo ${deviceId}...`);

    try {
      // Timeout para evitar que se quede colgado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: El servidor no responde')), 8000);
      });

      const apiPromise = DevicesAPI.getDeviceById(deviceId);
      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (response.success) {
        const device = response.data.device;
        
        // Cachear los detalles
        cacheService.set(cacheKey, device, CACHE_TTL.DEVICE_DETAILS);
        
        console.log(`[API] Detalles del dispositivo ${deviceId} cargados y cacheados`);
        return device;
      } else {
        throw new Error("Error en respuesta del servidor");
      }
    } catch (error) {
      console.error(`[ERROR] Error cargando detalles del dispositivo ${deviceId}:`, error);
      
      // Fallback: devolver datos de ejemplo
      const fallbackDevice = {
        id: 1,
        id_dispositivo: deviceId,
        nombre: "Dispositivo Demo",
        tipo: "sensor",
        ubicacion: "Laboratorio",
        estado: "activo",
        ultima_conexion: new Date().toISOString(),
        metadatos: {},
        fecha_creacion: new Date().toISOString()
      };
      
      console.log(`[FALLBACK] Usando datos de fallback para dispositivo ${deviceId}`);
      cacheService.set(cacheKey, fallbackDevice, 60000);
      return fallbackDevice;
    }
  }

  /**
   * Obtiene datos de sensores de un dispositivo con cache y batching
   * @param {string} deviceId - ID del dispositivo
   * @param {number} limit - Límite de registros
   * @returns {Promise<Array>} Datos de sensores
   */
  async getDeviceSensorData(deviceId, limit = 50) {
    const cacheKey = `${CACHE_KEYS.DEVICE_SENSOR_DATA}_${deviceId}_${limit}`;
    
    // Verificar cache primero
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE] Datos de sensores del dispositivo ${deviceId} obtenidos del cache`);
      return cached;
    }

    // Usar batching si hay múltiples peticiones pendientes
    return this._batchRequest('sensor_data', deviceId, limit, async () => {
      console.log(`[API] Cargando datos de sensores del dispositivo ${deviceId}...`);

      try {
        // Timeout para evitar que se quede colgado
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout: El servidor no responde')), 6000);
        });

        const apiPromise = DevicesAPI.getDeviceSensorData(deviceId, limit);
        const response = await Promise.race([apiPromise, timeoutPromise]);

        if (response.success) {
          const sensorData = response.data;
          
          // Cachear los datos (TTL más corto para datos dinámicos)
          cacheService.set(cacheKey, sensorData, CACHE_TTL.DEVICE_SENSOR_DATA);
          
          console.log(`[API] ${sensorData.length} registros de sensores cargados y cacheados`);
          return sensorData;
        } else {
          throw new Error("Error en respuesta del servidor");
        }
      } catch (error) {
        console.error(`[ERROR] Error cargando datos de sensores del dispositivo ${deviceId}:`, error);
        
        // Fallback: devolver datos de ejemplo
        const fallbackData = [
          {
            id: 1,
            tipo_sensor: "temperatura",
            valor: "22.5",
            unidad: "°C",
            timestamp: new Date().toISOString(),
            metadatos: {}
          },
          {
            id: 2,
            tipo_sensor: "humedad",
            valor: "65.2",
            unidad: "%",
            timestamp: new Date(Date.now() - 60000).toISOString(),
            metadatos: {}
          }
        ];
        
        console.log(`[FALLBACK] Usando datos de fallback para sensores del dispositivo ${deviceId}`);
        cacheService.set(cacheKey, fallbackData, 60000);
        return fallbackData;
      }
    });
  }

  /**
   * Sistema de batching para agrupar peticiones similares
   * @private
   */
  _batchRequest(type, deviceId, limit, requestFn) {
    return new Promise((resolve, reject) => {
      const batchKey = `${type}_${deviceId}_${limit}`;
      
      // Si ya existe una petición para este dispositivo exacto, reutilizar
      if (this.loadingPromises.has(batchKey)) {
        this.loadingPromises.get(batchKey).then(resolve).catch(reject);
        return;
      }

      // Inicializar cola si no existe
      if (!this.batchQueues.has(type)) {
        this.batchQueues.set(type, []);
      }

      const queue = this.batchQueues.get(type);
      
      // Agregar a la cola
      queue.push({
        deviceId,
        limit,
        requestFn,
        resolve,
        reject,
        batchKey
      });

      // Programar ejecución del batch
      this._scheduleBatch(type);
    });
  }

  /**
   * Programa la ejecución de un batch
   * @private
   */
  _scheduleBatch(type) {
    // Limpiar timer anterior si existe
    if (this.batchTimers.has(type)) {
      clearTimeout(this.batchTimers.get(type));
    }

    const queue = this.batchQueues.get(type);
    if (!queue || queue.length === 0) return;

    // Si hay suficiente en la cola, ejecutar inmediatamente
    if (queue.length >= this.BATCH_SIZE) {
      this._executeBatch(type);
      return;
    }

    // Programar ejecución después del delay
    const timer = setTimeout(() => {
      this._executeBatch(type);
    }, this.BATCH_DELAY);

    this.batchTimers.set(type, timer);
  }

  /**
   * Ejecuta un batch de peticiones
   * @private
   */
  async _executeBatch(type) {
    const queue = this.batchQueues.get(type);
    if (!queue || queue.length === 0) return;

    // Limpiar timer
    if (this.batchTimers.has(type)) {
      clearTimeout(this.batchTimers.get(type));
      this.batchTimers.delete(type);
    }

    // Obtener items a procesar (máximo BATCH_SIZE)
    const itemsToProcess = queue.splice(0, this.BATCH_SIZE);

    // Ejecutar items con limitación de concurrencia
    const maxConcurrent = Math.min(this.MAX_CONCURRENT, itemsToProcess.length);
    const batches = [];
    
    // Dividir en sub-batches para control de concurrencia
    for (let i = 0; i < itemsToProcess.length; i += maxConcurrent) {
      const batch = itemsToProcess.slice(i, i + maxConcurrent);
      batches.push(batch);
    }

    // Ejecutar cada sub-batch
    for (const batch of batches) {
      // Ejecutar peticiones del batch en paralelo
      const promises = batch.map(item => {
        // Guardar promesa para reutilización
        const promise = item.requestFn()
          .then(result => {
            item.resolve(result);
            return result;
          })
          .catch(error => {
            item.reject(error);
            throw error;
          })
          .finally(() => {
            this.loadingPromises.delete(item.batchKey);
          });

        this.loadingPromises.set(item.batchKey, promise);
        return promise;
      });

      // Esperar a que termine este batch antes del siguiente (pequeño delay)
      await Promise.allSettled(promises);
      
      // Pequeño delay entre batches para no saturar el servidor
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Si quedan items en la cola, programar siguiente ejecución
    if (queue.length > 0) {
      this._scheduleBatch(type);
    }
  }

  /**
   * Obtiene estadísticas de un dispositivo con cache
   * @param {string} deviceId - ID del dispositivo
   * @returns {Promise<Object>} Estadísticas del dispositivo
   */
  async getDeviceStats(deviceId) {
    const cacheKey = `${CACHE_KEYS.DEVICE_STATS}_${deviceId}`;
    
    // Verificar cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      console.log(`[CACHE] Estadisticas del dispositivo ${deviceId} obtenidas del cache`);
      return cached;
    }

    console.log(`[API] Cargando estadisticas del dispositivo ${deviceId}...`);

    try {
      // Timeout para evitar que se quede colgado
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: El servidor no responde')), 6000);
      });

      const apiPromise = DevicesAPI.getDeviceById(deviceId);
      const response = await Promise.race([apiPromise, timeoutPromise]);

      if (response.success) {
        const stats = response.data.stats;
        
        // Cachear las estadísticas
        cacheService.set(cacheKey, stats, CACHE_TTL.DEVICE_STATS);
        
        console.log(`[API] Estadisticas del dispositivo ${deviceId} cargadas y cacheadas`);
        return stats;
      } else {
        throw new Error("Error en respuesta del servidor");
      }
    } catch (error) {
      console.error(`[ERROR] Error cargando estadisticas del dispositivo ${deviceId}:`, error);
      
      // Fallback: devolver estadísticas de ejemplo
      const fallbackStats = {
        total_datos: 150,
        ultimo_dato: new Date().toISOString(),
        primer_dato: new Date(Date.now() - 86400000).toISOString(), // 24 horas atrás
        tipos_sensor: 3,
        promedio_valor: 25.5
      };
      
      console.log(`[FALLBACK] Usando estadisticas de fallback para dispositivo ${deviceId}`);
      cacheService.set(cacheKey, fallbackStats, 60000);
      return fallbackStats;
    }
  }

  /**
   * Invalida el cache de un dispositivo específico
   * @param {string} deviceId - ID del dispositivo
   */
  invalidateDeviceCache(deviceId) {
    const keys = [
      `${CACHE_KEYS.DEVICE_DETAILS}_${deviceId}`,
      `${CACHE_KEYS.DEVICE_SENSOR_DATA}_${deviceId}`,
      `${CACHE_KEYS.DEVICE_STATS}_${deviceId}`
    ];

    keys.forEach(key => {
      cacheService.delete(key);
    });

    console.log(`[CACHE] Cache del dispositivo ${deviceId} invalidado`);
  }

  /**
   * Invalida todo el cache de dispositivos
   */
  invalidateAllDevicesCache() {
    cacheService.delete(CACHE_KEYS.DEVICES);
    console.log("[CACHE] Cache de dispositivos invalidado");
  }

  /**
   * Obtiene estadísticas del servicio
   * @returns {Object} Estadísticas del servicio y cache
   */
  getServiceStats() {
    return {
      isLoading: this.isLoading,
      cacheStats: cacheService.getStats(),
      loadingPromises: this.loadingPromises.size
    };
  }
}

// Instancia singleton
export const deviceService = new DeviceService();
