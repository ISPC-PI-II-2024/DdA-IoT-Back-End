// ==========================
// Controlador para datos de temperatura desde MQTT
// Endpoints para obtener datos históricos y estadísticas
// ==========================
import { mqttService } from "../service/mqtt.service.js";

export async function getTemperatureData(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = mqttService.getTemperatureData(limit);
    
    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo datos de temperatura:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function getTemperatureStats(req, res) {
  try {
    const stats = mqttService.getStats();
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function getLatestTemperature(req, res) {
  try {
    const latest = mqttService.getLatestTemperature();
    
    res.json({
      success: true,
      data: latest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error obteniendo última temperatura:", error);
    res.status(500).json({ 
      success: false, 
      error: "Error interno del servidor" 
    });
  }
}

export async function getMQTTStatus(req, res) {
  try {
    const connectionInfo = mqttService.getConnectionInfo();
    
    res.json({
      success: true,
      status: connectionInfo,
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
