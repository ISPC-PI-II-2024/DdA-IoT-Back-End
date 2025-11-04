// ==========================
// Rutas para datos de temperatura desde MQTT
// ==========================
import { Router } from "express";
import { 
  getTemperatureData, 
  getTemperatureStats, 
  getLatestTemperature,
  getMQTTStatus 
} from "../controllers/temperature.controllers.js";

const router = Router();

// Obtener datos históricos de temperatura
router.get("/temperature", getTemperatureData);

// Obtener estadísticas de temperatura
router.get("/temperature/stats", getTemperatureStats);

// Obtener última temperatura recibida
router.get("/temperature/latest", getLatestTemperature);

// Estado de conexión MQTT
router.get("/mqtt/status", getMQTTStatus);

export default router;
