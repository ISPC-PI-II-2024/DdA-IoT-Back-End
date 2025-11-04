// ==========================
// Controladores para configuración del sistema
// - Configuración general (todos los usuarios autenticados)
// - Configuración avanzada (solo admin)
// - Umbrales y triggers
// ==========================
import { mqttService } from "../service/mqtt.service.js";
import { pool } from "../db/index.js";

export async function getGeneralConfig(req, res) {
  try {
    // Configuración básica accesible para todos los usuarios autenticados
    const config = {
      systemInfo: {
        version: "1.0.0",
        lastUpdate: new Date().toISOString().split('T')[0],
        status: "online",
        dataCount: Math.floor(Math.random() * 10000) + 1000 // Simulado
      },
      allowedSettings: {
        temperatureUnit: ["celsius", "fahrenheit"],
        chartRefreshIntervals: [1000, 5000, 30000],
        maxChartPoints: 1000
      },
      userRole: req.user?.role || "guest"
    };

    res.json({
      success: true,
      config: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo configuración general:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function getAdvancedConfig(req, res) {
  try {
    // Solo admin puede ver configuración avanzada
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    // Configuración avanzada (en producción, esto vendría de una BD)
    const config = {
      thresholds: {
        // Umbrales de temperatura
        tempMin: 15.0,
        tempMax: 30.0,
        tempCriticalMin: 5.0,
        tempCriticalMax: 40.0,
        // Umbrales de humedad
        humidityMin: 30.0,
        humidityMax: 80.0,
        // Umbral de batería
        batteryLow: 20.0,
        // Configuración de alertas
        enableTempAlerts: true,
        enableHumidityAlerts: true,
        enableBatteryAlerts: true
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
      },
      system: {
        maintenanceMode: false,
        backupEnabled: true,
        logLevel: "info"
      }
    };

    res.json({
      success: true,
      config: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo configuración avanzada:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function updateAdvancedConfig(req, res) {
  try {
    // Solo admin puede actualizar configuración avanzada
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: "Configuración requerida"
      });
    }

    // Validar configuración básica
    if (config.thresholds) {
      validateThresholds(config.thresholds);
    }
    
    if (config.charts) {
      validateChartsConfig(config.charts);
    }
    
    if (config.mqtt) {
      validateMQTTConfig(config.mqtt);
    }

    // En producción, esto se guardaría en BD
    // Por ahora, retornamos éxito
    console.log("Configuración avanzada actualizada:", config);
    console.log("Usuario:", req.user.email);

    res.json({
      success: true,
      message: "Configuración avanzada actualizada exitosamente",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error actualizando configuración avanzada:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Error interno del servidor" 
    });
  }
}

export async function getMQTTStatus(req, res) {
  try {
    // URL externa para obtener estado MQTT desde el servicio
    const connectionInfo = mqttService.getConnectionInfo();
    
    res.json({
      success: true,
      mqtt: connectionInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo estado MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function restartMQTTConnection(req, res) {
  try {
    // Solo admin puede reiniciar conexión MQTT
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    // Reiniciar conexión
    mqttService.disconnect();
    setTimeout(() => {
      mqttService.connect();
    }, 2000);

    res.json({
      success: true,
      message: "Conexión MQTT reiniciada",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error reiniciando conexión MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function clearDataCache(req, res) {
  try {
    // Solo admin puede limpiar cache
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    // Limpiar datos de temperatura almacenados
    mqttService.temperatureData = []; // Acceder directamente a la propiedad
    
    console.log("Cache de datos limpiado por:", req.user.email);

    res.json({
      success: true,
      message: "Cache de datos limpiado exitosamente",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error limpiando cache:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function reloadMQTTTopics(req, res) {
  try {
    // Solo admin puede recargar tópicos
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    // Recargar tópicos desde la base de datos
    const result = await mqttService.reloadTopics();
    
    console.log("Tópicos MQTT recargados por:", req.user.email);
    console.log("Nuevos tópicos:", result.topics);

    res.json({
      success: true,
      message: "Tópicos MQTT recargados exitosamente",
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error recargando tópicos MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function getMQTTTopics(req, res) {
  try {
    // Todos los usuarios autenticados pueden ver los tópicos disponibles
    
    // Obtener información detallada de los tópicos desde la base de datos
    const conn = await pool.getConnection();
    
    const [topicsRows] = await conn.execute(`
      SELECT 
        id,
        nombre, 
        descripcion, 
        qos_level, 
        tipo_datos, 
        dispositivo_asociado,
        metadatos,
        activo,
        fecha_creacion,
        fecha_actualizacion
      FROM mqtt_topics 
      WHERE activo = TRUE 
      ORDER BY tipo_datos, nombre ASC
    `);
    
    conn.release();
    
    // También obtener información de conexión actual
    const connectionInfo = mqttService.getConnectionInfo();
    
    res.json({
      success: true,
      data: {
        topics: topicsRows,
        currentTopics: connectionInfo.topics,
        topicsFromDB: connectionInfo.topicsFromDB,
        connectionStatus: connectionInfo.connected,
        brokerUrl: connectionInfo.brokerUrl
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo tópicos MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function createMQTTTopic(req, res) {
  try {
    // Solo admin puede crear tópicos
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    const { nombre, descripcion, qos_level, tipo_datos, dispositivo_asociado, metadatos } = req.body;
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: "Nombre del tópico es requerido"
      });
    }

    // Validar QoS level
    if (qos_level && ![0, 1, 2].includes(parseInt(qos_level))) {
      return res.status(400).json({
        success: false,
        error: "QoS level debe ser 0, 1 o 2"
      });
    }

    // Validar tipo de datos
    const validTypes = ['temperatura', 'humedad', 'presion', 'general', 'comando'];
    if (tipo_datos && !validTypes.includes(tipo_datos)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de datos debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    const conn = await pool.getConnection();
    
    // Verificar que el tópico no exista
    const [existingTopic] = await conn.execute(
      "SELECT id FROM mqtt_topics WHERE nombre = ?",
      [nombre]
    );
    
    if (existingTopic.length > 0) {
      conn.release();
      return res.status(409).json({
        success: false,
        error: "Ya existe un tópico con ese nombre"
      });
    }

    // Crear el tópico
    const [result] = await conn.execute(`
      INSERT INTO mqtt_topics (nombre, descripcion, qos_level, tipo_datos, dispositivo_asociado, metadatos)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      nombre,
      descripcion || null,
      qos_level || 1,
      tipo_datos || 'general',
      dispositivo_asociado || null,
      metadatos ? JSON.stringify(metadatos) : '{}'
    ]);

    conn.release();

    console.log(`✅ Nuevo tópico MQTT creado: ${nombre} por ${req.user.email}`);

    res.json({
      success: true,
      data: {
        id: result.insertId,
        nombre,
        descripcion,
        qos_level: qos_level || 1,
        tipo_datos: tipo_datos || 'general',
        dispositivo_asociado,
        metadatos: metadatos || {}
      },
      message: "Tópico MQTT creado exitosamente",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creando tópico MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function updateMQTTTopic(req, res) {
  try {
    // Solo admin puede actualizar tópicos
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    const { id } = req.params;
    const { nombre, descripcion, qos_level, tipo_datos, dispositivo_asociado, metadatos, activo } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID del tópico es requerido"
      });
    }

    // Validar QoS level
    if (qos_level && ![0, 1, 2].includes(parseInt(qos_level))) {
      return res.status(400).json({
        success: false,
        error: "QoS level debe ser 0, 1 o 2"
      });
    }

    // Validar tipo de datos
    const validTypes = ['temperatura', 'humedad', 'presion', 'general', 'comando'];
    if (tipo_datos && !validTypes.includes(tipo_datos)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de datos debe ser uno de: ${validTypes.join(', ')}`
      });
    }

    const conn = await pool.getConnection();
    
    // Verificar que el tópico exista
    const [existingTopic] = await conn.execute(
      "SELECT id, nombre FROM mqtt_topics WHERE id = ?",
      [id]
    );
    
    if (existingTopic.length === 0) {
      conn.release();
      return res.status(404).json({
        success: false,
        error: "Tópico no encontrado"
      });
    }

    // Si se está cambiando el nombre, verificar que no exista otro con ese nombre
    if (nombre && nombre !== existingTopic[0].nombre) {
      const [duplicateTopic] = await conn.execute(
        "SELECT id FROM mqtt_topics WHERE nombre = ? AND id != ?",
        [nombre, id]
      );
      
      if (duplicateTopic.length > 0) {
        conn.release();
        return res.status(409).json({
          success: false,
          error: "Ya existe otro tópico con ese nombre"
        });
      }
    }

    // Actualizar el tópico
    const updateFields = [];
    const updateValues = [];

    if (nombre !== undefined) {
      updateFields.push("nombre = ?");
      updateValues.push(nombre);
    }
    if (descripcion !== undefined) {
      updateFields.push("descripcion = ?");
      updateValues.push(descripcion);
    }
    if (qos_level !== undefined) {
      updateFields.push("qos_level = ?");
      updateValues.push(qos_level);
    }
    if (tipo_datos !== undefined) {
      updateFields.push("tipo_datos = ?");
      updateValues.push(tipo_datos);
    }
    if (dispositivo_asociado !== undefined) {
      updateFields.push("dispositivo_asociado = ?");
      updateValues.push(dispositivo_asociado);
    }
    if (metadatos !== undefined) {
      updateFields.push("metadatos = ?");
      updateValues.push(JSON.stringify(metadatos));
    }
    if (activo !== undefined) {
      updateFields.push("activo = ?");
      updateValues.push(activo);
    }

    if (updateFields.length === 0) {
      conn.release();
      return res.status(400).json({
        success: false,
        error: "No hay campos para actualizar"
      });
    }

    updateFields.push("fecha_actualizacion = CURRENT_TIMESTAMP");
    updateValues.push(id);

    await conn.execute(`
      UPDATE mqtt_topics 
      SET ${updateFields.join(", ")}
      WHERE id = ?
    `, updateValues);

    conn.release();

    console.log(`✅ Tópico MQTT actualizado: ID ${id} por ${req.user.email}`);

    res.json({
      success: true,
      message: "Tópico MQTT actualizado exitosamente",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error actualizando tópico MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function deleteMQTTTopic(req, res) {
  try {
    // Solo admin puede eliminar tópicos
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID del tópico es requerido"
      });
    }

    const conn = await pool.getConnection();
    
    // Verificar que el tópico exista
    const [existingTopic] = await conn.execute(
      "SELECT id, nombre FROM mqtt_topics WHERE id = ?",
      [id]
    );
    
    if (existingTopic.length === 0) {
      conn.release();
      return res.status(404).json({
        success: false,
        error: "Tópico no encontrado"
      });
    }

    // Eliminar el tópico (soft delete - marcar como inactivo)
    await conn.execute(
      "UPDATE mqtt_topics SET activo = FALSE, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    conn.release();

    console.log(`✅ Tópico MQTT eliminado: ${existingTopic[0].nombre} por ${req.user.email}`);

    res.json({
      success: true,
      message: "Tópico MQTT eliminado exitosamente",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error eliminando tópico MQTT:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

// Funciones de validación
function validateThresholds(thresholds) {
  const validKeys = ['tempMin', 'tempMax', 'tempCriticalMin', 'tempCriticalMax', 'humidityMin', 'humidityMax', 'batteryLow'];
  
  for (const key of validKeys) {
    if (thresholds[key] !== undefined) {
      const value = parseFloat(thresholds[key]);
      if (isNaN(value) || value < 0) {
        throw new Error(`Umbral ${key} debe ser un número válido mayor o igual a 0`);
      }
    }
  }

  // Validar lógica de umbrales de temperatura
  if (thresholds.tempMin && thresholds.tempMax && thresholds.tempMin >= thresholds.tempMax) {
    throw new Error("Temperatura mínima debe ser menor que máxima");
  }
  
  if (thresholds.tempCriticalMin && thresholds.tempMin && thresholds.tempCriticalMin >= thresholds.tempMin) {
    throw new Error("Temperatura crítica mínima debe ser menor que temperatura mínima");
  }
  
  if (thresholds.tempMax && thresholds.tempCriticalMax && thresholds.tempMax >= thresholds.tempCriticalMax) {
    throw new Error("Temperatura máxima debe ser menor que temperatura crítica máxima");
  }
  
  // Validar lógica de umbrales de humedad
  if (thresholds.humidityMin && thresholds.humidityMax && thresholds.humidityMin >= thresholds.humidityMax) {
    throw new Error("Humedad mínima debe ser menor que máxima");
  }
  
  // Validar umbral de batería
  if (thresholds.batteryLow && (thresholds.batteryLow < 0 || thresholds.batteryLow > 100)) {
    throw new Error("Umbral de batería baja debe estar entre 0 y 100");
  }
}

function validateChartsConfig(charts) {
  if (charts.updateInterval && (charts.updateInterval < 100 || charts.updateInterval > 60000)) {
    throw new Error("Intervalo de actualización debe estar entre 100ms y 60s");
  }
  
  if (charts.dataPoints && (charts.dataPoints < 10 || charts.dataPoints > 1000)) {
    throw new Error("Puntos de datos debe estar entre 10 y 1000");
  }
}

function validateMQTTConfig(mqtt) {
  if (mqtt.topics && !Array.isArray(mqtt.topics)) {
    throw new Error("Topics MQTT debe ser un array");
  }
  
  if (mqtt.qosLevel && ![0, 1, 2].includes(mqtt.qosLevel)) {
    throw new Error("Nivel QoS debe ser 0, 1 o 2");
  }
  
  if (mqtt.timeout && (mqtt.timeout < 1000 || mqtt.timeout > 300000)) {
    throw new Error("Timeout debe estar entre 1s y 5m");
  }
}
