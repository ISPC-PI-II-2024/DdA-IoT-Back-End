import { mqttService } from "../service/mqtt.service.js";

export async function getCO2Data(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const data = mqttService.getCO2Data(limit);

    res.json({
      success: true,
      data: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo datos de CO2:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getCO2Stats(req, res) {
  try {
    const stats = mqttService.getCO2Stats();

    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas de CO2:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getLatestCO2(req, res) {
  try {
    const latest = mqttService.getLatestCO2();

    res.json({
      success: true,
      data: latest,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo última CO2:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}

export async function getMQTTStatus(req, res) {
  try {
    const connectionInfo = mqttService.getConnectionInfo();

    res.json({
      success: true,
      status: connectionInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo estado MQTT:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
}
