// ==========================
// Servicio para gestionar tópicos MQTT dinámicos
// Obtiene tópicos desde la base de datos y los cachea localmente
// ==========================

import { ConfigAPI } from "../api.js";
import { storage } from "./storage.js";

const CACHE_KEY = "mqtt_topics_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

class MQTTTopicsService {
  constructor() {
    this.topics = [];
    this.topicsByType = new Map();
    this.lastUpdate = null;
    this.listeners = new Set();
    
    // Asegurar que topics es siempre un array
    if (!Array.isArray(this.topics)) {
      this.topics = [];
    }
  }

  /**
   * Obtiene los tópicos MQTT desde el servidor
   */
  async loadTopics() {
    try {
      const response = await ConfigAPI.getMQTTTopics();
      if (response && response.success && response.data) {
        // El backend devuelve { success: true, data: { topics: [...] } }
        const topicsData = response.data.topics || [];
        
        // Asegurar que topicsData es un array
        this.topics = Array.isArray(topicsData) ? topicsData : [];
        this.topicsByType.clear();
        
        // Organizar tópicos por tipo solo si es array
        if (Array.isArray(this.topics) && this.topics.length > 0) {
          try {
            this.topics.forEach(topic => {
              const type = topic.tipo_datos || 'general';
              if (!this.topicsByType.has(type)) {
                this.topicsByType.set(type, []);
              }
              this.topicsByType.get(type).push(topic);
            });
          } catch (error) {
            console.error("Error organizando tópicos por tipo:", error);
            this.topicsByType.clear();
          }
        }
        
        this.lastUpdate = Date.now();
        
        // Cachear en localStorage
        storage.set(CACHE_KEY, {
          topics: this.topics,
          topicsByType: Array.from(this.topicsByType.entries()),
          lastUpdate: this.lastUpdate
        });
        
        this.notifyListeners();
        return this.topics;
      }
    } catch (error) {
      console.error("Error cargando tópicos MQTT:", error);
      
      // Intentar cargar desde cache
      const cached = storage.get(CACHE_KEY);
      if (cached && (Date.now() - cached.lastUpdate) < CACHE_DURATION) {
        const cachedTopics = cached.topics || [];
        this.topics = Array.isArray(cachedTopics) ? cachedTopics : [];
        
        // Reconstruir Map desde cache
        if (Array.isArray(cached.topicsByType)) {
          this.topicsByType = new Map(cached.topicsByType);
        } else {
          this.topicsByType = new Map();
        }
        
        this.lastUpdate = cached.lastUpdate;
        return this.topics;
      }
    }
    
    // Fallback: asegurar que siempre es array
    this.topics = [];
    this.topicsByType = new Map();
    return [];
  }

  /**
   * Obtiene tópicos por tipo específico
   */
  getTopicsByType(type) {
    return this.topicsByType.get(type) || [];
  }

  /**
   * Obtiene todos los tópicos de temperatura
   */
  getTemperatureTopics() {
    return this.getTopicsByType('temperatura');
  }

  /**
   * Obtiene todos los tópicos de humedad
   */
  getHumidityTopics() {
    return this.getTopicsByType('humedad');
  }

  /**
   * Obtiene todos los tópicos de presión
   */
  getPressureTopics() {
    return this.getTopicsByType('presion');
  }

  /**
   * Obtiene tópicos de comandos
   */
  getCommandTopics() {
    return this.getTopicsByType('comando');
  }

  /**
   * Obtiene tópicos generales
   */
  getGeneralTopics() {
    return this.getTopicsByType('general');
  }

  /**
   * Busca un tópico por nombre
   */
  findTopicByName(name) {
    return this.topics.find(topic => topic.nombre === name);
  }

  /**
   * Obtiene todos los nombres de tópicos como array
   */
  getTopicNames() {
    return this.topics.map(topic => topic.nombre);
  }

  /**
   * Obtiene tópicos para un dispositivo específico
   */
  getTopicsForDevice(deviceId) {
    return this.topics.filter(topic => topic.dispositivo_asociado === deviceId);
  }

  /**
   * Verifica si los datos están actualizados
   */
  isDataFresh() {
    return this.lastUpdate && (Date.now() - this.lastUpdate) < CACHE_DURATION;
  }

  /**
   * Fuerza la recarga de tópicos desde el servidor
   */
  async refreshTopics() {
    // Limpiar cache
    storage.del(CACHE_KEY);
    return await this.loadTopics();
  }

  /**
   * Suscribirse a cambios en los tópicos
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notificar a los listeners sobre cambios
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.topics, this.topicsByType);
      } catch (error) {
        console.error("Error en listener de tópicos MQTT:", error);
      }
    });
  }

  /**
   * Obtiene información de conexión MQTT
   */
  async getConnectionInfo() {
    try {
      const response = await ConfigAPI.getMQTTStatus();
      return response.success ? response.mqtt : null;
    } catch (error) {
      console.error("Error obteniendo información de conexión MQTT:", error);
      return null;
    }
  }

  /**
   * Recarga tópicos desde el servidor (solo admin)
   */
  async reloadTopics() {
    try {
      const response = await ConfigAPI.reloadMQTTTopics();
      if (response.success) {
        // Recargar tópicos después de la recarga
        await this.loadTopics();
        return response.data;
      }
    } catch (error) {
      console.error("Error recargando tópicos MQTT:", error);
    }
    return null;
  }

  /**
   * Obtiene estadísticas de los tópicos
   */
  getStats() {
    const stats = {
      total: this.topics.length,
      byType: {},
      withDevice: 0,
      withoutDevice: 0
    };

    this.topics.forEach(topic => {
      const type = topic.tipo_datos || 'general';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      if (topic.dispositivo_asociado) {
        stats.withDevice++;
      } else {
        stats.withoutDevice++;
      }
    });

    return stats;
  }
}

// Instancia singleton
export const mqttTopicsService = new MQTTTopicsService();

// Auto-cargar tópicos al inicializar
mqttTopicsService.loadTopics().catch(error => {
  console.warn("No se pudieron cargar tópicos MQTT inicialmente:", error);
});
