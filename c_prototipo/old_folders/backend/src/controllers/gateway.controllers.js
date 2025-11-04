// ==========================
// Controladores para datos de gateway, endpoints y sensores
// Maneja los nuevos tópicos MQTT: gateway/gateway, gateway/endpoint, gateway/sensor
// ==========================
import { mqttService } from "../service/mqtt.service.js";

// ==========================
// GATEWAY CONTROLLERS
// ==========================

export async function getAllGateways(req, res) {
  try {
    const gateways = mqttService.getAllGateways();

    res.json({
      success: true,
      data: gateways,
      count: gateways.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo gateways:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getGatewayById(req, res) {
  try {
    const { gatewayId } = req.params;
    const gateway = mqttService.getGatewayById(gatewayId);

    if (!gateway) {
      return res.status(404).json({
        success: false,
        error: "Gateway no encontrado",
      });
    }

    // Obtener endpoints asociados
    const endpoints = mqttService.getEndpointsByGateway(gatewayId);

    res.json({
      success: true,
      data: {
        gateway,
        endpoints,
        endpointCount: endpoints.length
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo gateway:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

// ==========================
// ENDPOINT CONTROLLERS
// ==========================

export async function getAllEndpoints(req, res) {
  try {
    const endpoints = mqttService.getAllEndpoints();

    res.json({
      success: true,
      data: endpoints,
      count: endpoints.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo endpoints:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getEndpointById(req, res) {
  try {
    const { endpointId } = req.params;
    const endpoint = mqttService.getEndpointById(endpointId);

    if (!endpoint) {
      return res.status(404).json({
        success: false,
        error: "Endpoint no encontrado",
      });
    }

    // Obtener sensores asociados
    const sensors = mqttService.getSensorsByEndpoint(endpointId);

    res.json({
      success: true,
      data: {
        endpoint,
        sensors,
        sensorCount: sensors.length
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

// ==========================
// SENSOR CONTROLLERS
// ==========================

export async function getAllSensors(req, res) {
  try {
    const sensors = mqttService.getAllSensors();

    res.json({
      success: true,
      data: sensors,
      count: sensors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo sensores:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getSensorById(req, res) {
  try {
    const { sensorId } = req.params;
    const sensor = mqttService.getSensorById(sensorId);

    if (!sensor) {
      return res.status(404).json({
        success: false,
        error: "Sensor no encontrado",
      });
    }

    res.json({
      success: true,
      data: sensor,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo sensor:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getSensorsByEndpoint(req, res) {
  try {
    const { endpointId } = req.params;
    const sensors = mqttService.getSensorsByEndpoint(endpointId);

    res.json({
      success: true,
      data: sensors,
      count: sensors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo sensores por endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

// ==========================
// THRESHOLDS CONTROLLERS
// ==========================

export async function getThresholds(req, res) {
  try {
    const thresholds = mqttService.getThresholds();

    res.json({
      success: true,
      data: thresholds,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo umbrales:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function updateThresholds(req, res) {
  try {
    // Solo admin puede actualizar umbrales
    if (req.user?.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado. Solo administradores" 
      });
    }

    const { thresholds } = req.body;
    
    if (!thresholds) {
      return res.status(400).json({
        success: false,
        error: "Umbrales requeridos"
      });
    }

    // Validar umbrales
    validateThresholds(thresholds);

    // Actualizar umbrales en el servicio MQTT
    mqttService.updateThresholds(thresholds);

    console.log("Umbrales actualizados por:", req.user.email);
    console.log("Nuevos umbrales:", thresholds);

    res.json({
      success: true,
      message: "Umbrales actualizados exitosamente",
      data: mqttService.getThresholds(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error actualizando umbrales:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Error interno del servidor" 
    });
  }
}

// ==========================
// STATUS CONTROLLERS
// ==========================

export async function getSystemStatus(req, res) {
  try {
    const gateways = mqttService.getAllGateways();
    const endpoints = mqttService.getAllEndpoints();
    const sensors = mqttService.getAllSensors();
    const thresholds = mqttService.getThresholds();

    // Calcular estadísticas
    const stats = {
      totalGateways: gateways.length,
      totalEndpoints: endpoints.length,
      totalSensors: sensors.length,
      onlineGateways: gateways.filter(g => g.lora_status === 'ok').length,
      onlineEndpoints: endpoints.filter(e => e.status === 'ok').length,
      onlineSensors: sensors.filter(s => s.status === 'ok').length,
      warningSensors: sensors.filter(s => s.status === 'warning').length,
      criticalSensors: sensors.filter(s => s.status === 'critical').length,
      batteryLowEndpoints: endpoints.filter(e => e.status === 'battery_low').length
    };

    res.json({
      success: true,
      data: {
        stats,
        thresholds,
        gateways,
        endpoints,
        sensors
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo estado del sistema:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

// ==========================
// VALIDATION FUNCTIONS
// ==========================

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

  // Validar lógica de umbrales
  if (thresholds.tempMin && thresholds.tempMax && thresholds.tempMin >= thresholds.tempMax) {
    throw new Error("Temperatura mínima debe ser menor que máxima");
  }
  
  if (thresholds.tempCriticalMin && thresholds.tempMin && thresholds.tempCriticalMin >= thresholds.tempMin) {
    throw new Error("Temperatura crítica mínima debe ser menor que temperatura mínima");
  }
  
  if (thresholds.tempMax && thresholds.tempCriticalMax && thresholds.tempMax >= thresholds.tempCriticalMax) {
    throw new Error("Temperatura máxima debe ser menor que temperatura crítica máxima");
  }
  
  if (thresholds.humidityMin && thresholds.humidityMax && thresholds.humidityMin >= thresholds.humidityMax) {
    throw new Error("Humedad mínima debe ser menor que máxima");
  }
  
  if (thresholds.batteryLow && (thresholds.batteryLow < 0 || thresholds.batteryLow > 100)) {
    throw new Error("Umbral de batería baja debe estar entre 0 y 100");
  }
}
