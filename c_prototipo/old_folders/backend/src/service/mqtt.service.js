// ==========================
// Servicio MQTT para conectar con Mosquitto
// Configuración completa desde .env: host, port, usuario, contraseña, topics
// Los tópicos se obtienen desde la base de datos con fallback a ENV
// ==========================
import mqtt from "mqtt";
import { ENV } from "../config/env.js";
import { pool } from "../db/index.js";
import { syncGatewayToDB, syncEndpointToDB, syncSensorToDB } from "./data.service.js";

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.temperatureData = [];
    this.maxDataPoints = 100; // Mantener últimos 100 puntos
    this.subscribers = new Set(); // Para WebSocket broadcasting
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.topics = []; // Tópicos obtenidos desde DB
    this.topicsFromDB = false; // Flag para saber si se obtuvieron desde DB
    this.co2Data = [];
    
    // Nuevos datos para gateway
    this.gatewayData = new Map(); // gateway_id -> datos del gateway
    this.endpointData = new Map(); // endpoint_id -> datos del endpoint
    this.sensorData = new Map(); // sensor_id -> datos del sensor
    this.thresholds = {
      tempMin: 15,
      tempMax: 30,
      tempCriticalMin: 5,
      tempCriticalMax: 40,
      humidityMin: 30,
      humidityMax: 80,
      batteryLow: 20
    };
  }

  /**
   * Carga los tópicos MQTT desde la base de datos
   * Si falla, usa los tópicos de las variables de entorno como fallback
   */
  async loadTopicsFromDB() {
    try {
      const conn = await pool.getConnection();

      // Intentar obtener tópicos desde la tabla mqtt_topics
      const topicsRows = await conn.execute(`
        SELECT nombre, qos_level, tipo_datos, metadatos 
        FROM mqtt_topics 
        WHERE activo = TRUE 
        ORDER BY fecha_creacion ASC
      `);

      conn.release();

      if (topicsRows && topicsRows.length > 0) {
        this.topics = topicsRows.map((row) => row.nombre);
        this.topicsFromDB = true;
        console.log(
          `✅ Tópicos cargados desde DB: ${this.topics.length} tópicos`
        );

        // Log de información adicional de los tópicos
        topicsRows.forEach((topic) => {
          console.log(
            `  📡 ${topic.nombre} (QoS: ${topic.qos_level}, Tipo: ${topic.tipo_datos})`
          );
        });

        return;
      }

      // Si no hay tópicos en la tabla específica, intentar desde configuraciones_sistema
      const conn2 = await pool.getConnection();
      const configRows = await conn2.execute(`
        SELECT valor FROM configuraciones_sistema 
        WHERE clave = 'mqtt_topics_default' AND valor IS NOT NULL
      `);
      conn2.release();

      if (configRows && configRows.length > 0 && configRows[0].valor) {
        this.topics = configRows[0].valor
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        this.topicsFromDB = true;
        console.log(
          `✅ Tópicos cargados desde configuraciones_sistema: ${this.topics.length} tópicos`
        );
        return;
      }
    } catch (error) {
      console.error("❌ Error cargando tópicos desde DB:", error.message);
    }

    // Fallback a variables de entorno
    // Asegurar que MQTT_TOPICS es un array
    const envTopics = Array.isArray(ENV.MQTT_TOPICS) ? ENV.MQTT_TOPICS : [];
    this.topics = envTopics.length > 0 ? envTopics : ['gateway/gateway', 'gateway/endpoint', 'gateway/sensor'];
    this.topicsFromDB = false;
    console.log(
      `⚠️ Usando tópicos de ENV como fallback: ${this.topics.length} tópicos`
    );
  }

  async connect() {
    // Obtener tópicos desde la base de datos primero
    await this.loadTopicsFromDB();

    // Construir URL del broker desde configuración ENV
    const brokerUrl = this.buildBrokerUrl();
    const clientOptions = this.buildClientOptions();

    console.log(`🔌 Conectando a MQTT broker: ${brokerUrl}`);
    console.log(`📡 Topics configurados: ${this.topics.join(", ")}`);
    console.log(
      `📊 Fuente de tópicos: ${
        this.topicsFromDB ? "Base de datos" : "Variables de entorno"
      }`
    );

    this.client = mqtt.connect(brokerUrl, clientOptions);

    this.client.on("connect", () => {
      console.log("✅ Conectado a MQTT broker");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.subscribeToTopics();
    });

    this.client.on("error", (error) => {
      console.error("❌ Error MQTT:", error);
      this.isConnected = false;
    });

    this.client.on("disconnect", () => {
      console.log("🔌 Desconectado de MQTT broker");
      this.isConnected = false;
    });

    this.client.on("reconnect", () => {
      this.reconnectAttempts++;
      console.log(
        `🔄 Reconectando a MQTT broker... (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("❌ Máximo número de intentos de reconexión alcanzado");
        this.client.end();
      }
    });

    this.client.on("offline", () => {
      console.log("📴 Cliente MQTT offline");
      this.isConnected = false;
    });

    this.client.on("close", () => {
      console.log("🔒 Conexión MQTT cerrada");
      this.isConnected = false;
    });
  }

  buildBrokerUrl() {
    const protocol = ENV.MQTT_BROKER_PORT === 8883 ? "mqtts" : "mqtt";
    return `${protocol}://${ENV.MQTT_BROKER_HOST}:${ENV.MQTT_BROKER_PORT}`;
  }

  buildClientOptions() {
    const options = {
      clientId: `iot-webapp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30 * 1000,
      keepalive: 60,
      qos: 1, // Al menos una vez
      retain: false,
    };

    // Agregar autenticación si está configurada
    if (ENV.MQTT_BROKER_USERNAME && ENV.MQTT_BROKER_PASSWORD) {
      options.username = ENV.MQTT_BROKER_USERNAME;
      options.password = ENV.MQTT_BROKER_PASSWORD;
      console.log(`🔐 Usando autenticación MQTT: ${ENV.MQTT_BROKER_USERNAME}`);
    }

    // Configuración SSL/TLS para puerto 8883
    if (ENV.MQTT_BROKER_PORT === 8883) {
      options.rejectUnauthorized = false; // Para desarrollo, en producción usar certificados válidos
    }

    return options;
  }

  subscribeToTopics() {
    if (!this.client || !this.isConnected) {
      console.error(
        "❌ Cliente MQTT no conectado, no se pueden suscribir topics"
      );
      return;
    }

    console.log(`📡 Suscribiéndose a ${this.topics.length} topics...`);

    this.topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(`❌ Error suscribiéndose a ${topic}:`, err);
        } else {
          console.log(`✅ Suscrito a: ${topic}`);
        }
      });
    });

    this.client.on("message", (topic, message) => {
      this.handleMessage(topic, message);
    });
  }

  handleMessage(topic, message) {
    try {
      const data = JSON.parse(message.toString());
      const timestamp = new Date().toISOString();

      console.log(`📨 MQTT [${topic}]:`, data);

      // Broadcasting para logs (todos los mensajes MQTT)
      this.broadcastLogMessage(topic, data, timestamp);

      // Procesar datos según el tópico
      if (topic.startsWith('gateway/gateway')) {
        this.handleGatewayData(data, timestamp);
      } else if (topic.startsWith('gateway/endpoint')) {
        this.handleEndpointData(data, timestamp);
      } else if (topic.startsWith('gateway/sensor')) {
        this.handleSensorData(data, timestamp);
      } else {
        // Mantener compatibilidad con formato anterior
        if (this.isTemperatureData(data)) {
          const temperaturePoint = {
            timestamp,
            topic,
            temperature: parseFloat(data.temperature || data.temp || data.value),
            humidity: data.humidity ? parseFloat(data.humidity) : null,
            sensor_id: data.sensor_id || data.id || "unknown",
            raw_data: data,
          };

          this.addTemperatureData(temperaturePoint);
          this.broadcastToSubscribers(temperaturePoint);

          if (this.isCO2Data(data) || topic.toLowerCase().includes("co2")) {
            const co2Point = {
              timestamp,
              topic,
              co2: parseFloat(data.co2 || data.CO2 || data.value),
              sensor_id: data.sensor_id || data.id || "unknown",
              raw_data: data,
            };

            this.addCO2Data(co2Point);
            this.broadcastCO2ToSubscribers(co2Point);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error procesando mensaje MQTT:", error);
      // Intentar como texto plano
      const textMessage = message.toString();
      console.log(`📨 MQTT [${topic}] (texto):`, textMessage);

      // Broadcasting para logs (mensaje de error)
      this.broadcastLogMessage(topic, { error: textMessage, source: "text" }, new Date().toISOString());

      // Intentar parsear como número simple
      const numericValue = parseFloat(textMessage);
      if (!isNaN(numericValue)) {
        const temperaturePoint = {
          timestamp: new Date().toISOString(),
          topic,
          temperature: numericValue,
          humidity: null,
          sensor_id: "text_sensor",
          raw_data: { value: numericValue, source: "text" },
        };

        this.addTemperatureData(temperaturePoint);
        this.broadcastToSubscribers(temperaturePoint);
      }
    }
  }

  isTemperatureData(data) {
    return (
      data &&
      (typeof data.temperature === "number" ||
        typeof data.temp === "number" ||
        typeof data.value === "number" ||
        !isNaN(parseFloat(data.temperature)) ||
        !isNaN(parseFloat(data.temp)) ||
        !isNaN(parseFloat(data.value)))
    );
  }

  addTemperatureData(point) {
    this.temperatureData.push(point);

    // Mantener solo los últimos N puntos
    if (this.temperatureData.length > this.maxDataPoints) {
      this.temperatureData = this.temperatureData.slice(-this.maxDataPoints);
    }
  }

  broadcastToSubscribers(data) {
    const message = JSON.stringify({
      topic: "temperature",
      ts: Date.now(),
      payload: data,
    });

    this.subscribers.forEach((subscriber) => {
      try {
        if (subscriber.readyState === 1) {
          // WebSocket.OPEN
          subscriber.send(message);
        } else {
          // Remover suscriptores cerrados
          this.subscribers.delete(subscriber);
        }
      } catch (error) {
        console.error("❌ Error enviando a WebSocket:", error);
        this.subscribers.delete(subscriber);
      }
    });
  }

  addSubscriber(ws) {
    this.subscribers.add(ws);
    console.log(
      `📡 Nuevo suscriptor WebSocket. Total: ${this.subscribers.size}`
    );
  }

  removeSubscriber(ws) {
    this.subscribers.delete(ws);
    console.log(
      `📡 Suscriptor WebSocket removido. Total: ${this.subscribers.size}`
    );
  }

  getTemperatureData(limit = 50) {
    return this.temperatureData.slice(-limit);
  }

  getLatestTemperature() {
    return this.temperatureData.length > 0
      ? this.temperatureData[this.temperatureData.length - 1]
      : null;
  }

  getStats() {
    if (this.temperatureData.length === 0) {
      return { count: 0, avg: null, min: null, max: null };
    }

    const temps = this.temperatureData
      .map((d) => d.temperature)
      .filter((t) => !isNaN(t));
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const min = Math.min(...temps);
    const max = Math.max(...temps);

    return {
      count: this.temperatureData.length,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      latest: this.getLatestTemperature(),
    };
  }

  getConnectionInfo() {
    return {
      connected: this.isConnected,
      brokerUrl: this.buildBrokerUrl(),
      topics: this.topics,
      topicsFromDB: this.topicsFromDB,
      subscriberCount: this.subscribers.size,
      dataCount: this.temperatureData.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Recarga los tópicos desde la base de datos
   * Útil para actualizar tópicos sin reiniciar el servicio
   */
  async reloadTopics() {
    console.log("🔄 Recargando tópicos desde la base de datos...");
    await this.loadTopicsFromDB();

    if (this.isConnected) {
      console.log("📡 Re-suscribiéndose a los nuevos tópicos...");
      this.subscribeToTopics();
    }

    return {
      topics: this.topics,
      topicsFromDB: this.topicsFromDB,
      count: this.topics.length,
    };
  }

  isCO2Data(data) {
    return (
      data &&
      (typeof data.co2 === "number" ||
        typeof data.CO2 === "number" ||
        !isNaN(parseFloat(data.co2)) ||
        !isNaN(parseFloat(data.CO2)))
    );
  }

  addCO2Data(point) {
    this.co2Data.push(point);
    if (this.co2Data.length > this.maxDataPoints) {
      this.co2Data = this.co2Data.slice(-this.maxDataPoints);
    }
  }

  broadcastCO2ToSubscribers(data) {
    const message = JSON.stringify({
      type: "co2_update",
      data: data,
      timestamp: data.timestamp,
    });

    this.subscribers.forEach((subscriber) => {
      try {
        if (subscriber.readyState === 1) {
          subscriber.send(message);
        } else {
          this.subscribers.delete(subscriber);
        }
      } catch (error) {
        console.error("❌ Error enviando CO2 a WebSocket:", error);
        this.subscribers.delete(subscriber);
      }
    });
  }

  getCO2Data(limit = 50) {
    return this.co2Data.slice(-limit);
  }

  getLatestCO2() {
    return this.co2Data.length > 0
      ? this.co2Data[this.co2Data.length - 1]
      : null;
  }

  getCO2Stats() {
    if (this.co2Data.length === 0) {
      return { count: 0, avg: null, min: null, max: null };
    }

    const co2Values = this.co2Data.map((d) => d.co2).filter((c) => !isNaN(c));
    const avg = co2Values.reduce((a, b) => a + b, 0) / co2Values.length;
    const min = Math.min(...co2Values);
    const max = Math.max(...co2Values);

    return {
      count: this.co2Data.length,
      avg: Math.round(avg * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      latest: this.getLatestCO2(),
    };
  }

  // ==========================
  // Nuevos métodos para manejar datos de gateway
  // ==========================

  handleGatewayData(data, timestamp) {
    const gatewayId = data.id_gateway;
    const gatewayInfo = {
      id: gatewayId,
      wifi_signal: data.wifi_signal,
      lora_status: data.lora_status,
      uptime: data.uptime,
      timestamp,
      raw_data: data
    };

    this.gatewayData.set(gatewayId, gatewayInfo);
    this.broadcastGatewayUpdate(gatewayInfo);
    
    // Sincronizar con base de datos
    syncGatewayToDB(gatewayInfo).catch(error => {
      console.error('Error sincronizando gateway a DB:', error);
    });
    
    console.log(`📡 Gateway ${gatewayId} actualizado:`, gatewayInfo);
  }

  handleEndpointData(data, timestamp) {
    const gatewayId = data.id_gateway;
    
    if (data.endpoints && Array.isArray(data.endpoints)) {
      data.endpoints.forEach(endpoint => {
        const endpointId = endpoint.id;
        const endpointInfo = {
          id: endpointId,
          gateway_id: gatewayId,
          bateria: endpoint.bateria,
          cargando: endpoint.cargando,
          lora: endpoint.lora,
          sensores: endpoint.sensores,
          timestamp,
          raw_data: endpoint,
          status: this.getEndpointStatus(endpoint)
        };

        this.endpointData.set(endpointId, endpointInfo);
        this.broadcastEndpointUpdate(endpointInfo);
        
        // Sincronizar con base de datos
        syncEndpointToDB(endpointInfo).catch(error => {
          console.error('Error sincronizando endpoint a DB:', error);
        });
        
        console.log(`📡 Endpoint ${endpointId} actualizado:`, endpointInfo);
      });
    }
  }

  handleSensorData(data, timestamp) {
    const gatewayId = data.id_gateway;
    
    if (data.endpoints && Array.isArray(data.endpoints)) {
      data.endpoints.forEach(endpoint => {
        const endpointId = endpoint.id;
        
        if (endpoint.sensores && Array.isArray(endpoint.sensores)) {
          endpoint.sensores.forEach(sensor => {
            const sensorId = sensor.id;
            const sensorInfo = {
              id: sensorId,
              gateway_id: gatewayId,
              endpoint_id: endpointId,
              posicion: sensor.posicion,
              temperatura: sensor.temp,
              humedad: sensor.humedad,
              estado: sensor.estado,
              timestamp,
              raw_data: sensor,
              status: this.getSensorStatus(sensor),
              alerts: this.checkSensorAlerts(sensor)
            };

            this.sensorData.set(sensorId, sensorInfo);
            this.broadcastSensorUpdate(sensorInfo);
            
            // Sincronizar con base de datos
            syncSensorToDB(sensorInfo).catch(error => {
              console.error('Error sincronizando sensor a DB:', error);
            });
            
            // También agregar a datos de temperatura para compatibilidad
            const temperaturePoint = {
              timestamp,
              topic: `gateway/sensor`,
              temperature: sensor.temp,
              humidity: sensor.humedad,
              sensor_id: sensorId,
              gateway_id: gatewayId,
              endpoint_id: endpointId,
              raw_data: sensor,
            };

            this.addTemperatureData(temperaturePoint);
            this.broadcastToSubscribers(temperaturePoint);
            
            console.log(`📡 Sensor ${sensorId} actualizado:`, sensorInfo);
          });
        }
      });
    }
  }

  getEndpointStatus(endpoint) {
    if (endpoint.bateria < this.thresholds.batteryLow) return 'battery_low';
    if (endpoint.lora !== 'ok') return 'lora_error';
    return 'ok';
  }

  getSensorStatus(sensor) {
    if (sensor.estado !== 'ok') return sensor.estado;
    
    if (sensor.temp < this.thresholds.tempCriticalMin || 
        sensor.temp > this.thresholds.tempCriticalMax) {
      return 'critical';
    }
    
    if (sensor.temp < this.thresholds.tempMin || 
        sensor.temp > this.thresholds.tempMax) {
      return 'warning';
    }
    
    return 'ok';
  }

  checkSensorAlerts(sensor) {
    const alerts = [];
    
    if (sensor.temp < this.thresholds.tempCriticalMin) {
      alerts.push({ type: 'temp_critical_low', value: sensor.temp, threshold: this.thresholds.tempCriticalMin });
    } else if (sensor.temp > this.thresholds.tempCriticalMax) {
      alerts.push({ type: 'temp_critical_high', value: sensor.temp, threshold: this.thresholds.tempCriticalMax });
    } else if (sensor.temp < this.thresholds.tempMin) {
      alerts.push({ type: 'temp_low', value: sensor.temp, threshold: this.thresholds.tempMin });
    } else if (sensor.temp > this.thresholds.tempMax) {
      alerts.push({ type: 'temp_high', value: sensor.temp, threshold: this.thresholds.tempMax });
    }
    
    if (sensor.humedad < this.thresholds.humidityMin) {
      alerts.push({ type: 'humidity_low', value: sensor.humedad, threshold: this.thresholds.humidityMin });
    } else if (sensor.humedad > this.thresholds.humidityMax) {
      alerts.push({ type: 'humidity_high', value: sensor.humedad, threshold: this.thresholds.humidityMax });
    }
    
    return alerts;
  }

  broadcastGatewayUpdate(data) {
    const message = JSON.stringify({
      topic: "gateway_update",
      ts: Date.now(),
      payload: data,
    });

    this.subscribers.forEach((subscriber) => {
      try {
        if (subscriber.readyState === 1) {
          subscriber.send(message);
        } else {
          this.subscribers.delete(subscriber);
        }
      } catch (error) {
        console.error("❌ Error enviando gateway update:", error);
        this.subscribers.delete(subscriber);
      }
    });
  }

  broadcastEndpointUpdate(data) {
    const message = JSON.stringify({
      topic: "endpoint_update",
      ts: Date.now(),
      payload: data,
    });

    this.subscribers.forEach((subscriber) => {
      try {
        if (subscriber.readyState === 1) {
          subscriber.send(message);
        } else {
          this.subscribers.delete(subscriber);
        }
      } catch (error) {
        console.error("❌ Error enviando endpoint update:", error);
        this.subscribers.delete(subscriber);
      }
    });
  }

  broadcastSensorUpdate(data) {
    const message = JSON.stringify({
      topic: "sensor_update",
      ts: Date.now(),
      payload: data,
    });

    this.subscribers.forEach((subscriber) => {
      try {
        if (subscriber.readyState === 1) {
          subscriber.send(message);
        } else {
          this.subscribers.delete(subscriber);
        }
      } catch (error) {
        console.error("❌ Error enviando sensor update:", error);
        this.subscribers.delete(subscriber);
      }
    });
  }

  // Broadcasting específico para logs MQTT
  broadcastLogMessage(topic, data, timestamp) {
    const logMessage = JSON.stringify({
      topic: "mqtt_log",
      ts: Date.now(),
      payload: {
        mqtt_topic: topic,
        data: data,
        timestamp: timestamp,
      },
    });

    this.subscribers.forEach((subscriber) => {
      try {
        if (subscriber.readyState === 1) {
          subscriber.send(logMessage);
        } else {
          this.subscribers.delete(subscriber);
        }
      } catch (error) {
        console.error("❌ Error enviando log message:", error);
        this.subscribers.delete(subscriber);
      }
    });
  }

  // Métodos para obtener datos
  getAllGateways() {
    return Array.from(this.gatewayData.values());
  }

  getAllEndpoints() {
    return Array.from(this.endpointData.values());
  }

  getAllSensors() {
    return Array.from(this.sensorData.values());
  }

  getGatewayById(gatewayId) {
    return this.gatewayData.get(gatewayId);
  }

  getEndpointById(endpointId) {
    return this.endpointData.get(endpointId);
  }

  getSensorById(sensorId) {
    return this.sensorData.get(sensorId);
  }

  getSensorsByEndpoint(endpointId) {
    return Array.from(this.sensorData.values()).filter(sensor => sensor.endpoint_id === endpointId);
  }

  getEndpointsByGateway(gatewayId) {
    return Array.from(this.endpointData.values()).filter(endpoint => endpoint.gateway_id === gatewayId);
  }

  // Métodos para gestión de umbrales
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log("📊 Umbrales actualizados:", this.thresholds);
    
    // Re-evaluar todos los sensores con los nuevos umbrales
    this.sensorData.forEach((sensor, sensorId) => {
      const updatedSensor = {
        ...sensor,
        status: this.getSensorStatus(sensor.raw_data),
        alerts: this.checkSensorAlerts(sensor.raw_data)
      };
      this.sensorData.set(sensorId, updatedSensor);
    });
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  disconnect() {
    if (this.client) {
      console.log("🔌 Desconectando cliente MQTT...");
      this.client.end();
      this.isConnected = false;
    }
  }

  // Método para publicar datos (opcional, para testing)
  publish(topic, message) {
    if (!this.client || !this.isConnected) {
      console.error("❌ Cliente MQTT no conectado, no se puede publicar");
      return false;
    }

    try {
      this.client.publish(topic, JSON.stringify(message), { qos: 1 });
      console.log(`📤 Publicado en ${topic}:`, message);
      return true;
    } catch (error) {
      console.error("❌ Error publicando mensaje:", error);
      return false;
    }
  }
}

// Instancia singleton
export const mqttService = new MQTTService();
