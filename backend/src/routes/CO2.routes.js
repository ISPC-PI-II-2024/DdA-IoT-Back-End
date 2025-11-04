// ==========================
// Rutas para datos de temperatura desde MQTT
// ==========================
import { Router } from "express";
import {
  getCO2Data,
  getCO2Stats,
  getLatestCO2,
  getMQTTStatus,
} from "../controllers/CO2.controllers.js";

const router = Router();

// Obtener datos históricos de CO2
router.get("/co2", getCO2Data);

// Obtener estadísticas de CO2
router.get("/co2/stats", getCO2Stats);

// Obtener última CO2 recibida
router.get("/co2/latest", getLatestCO2);

// Estado de conexión MQTT
router.get("/mqtt/status", getMQTTStatus);

export default router;
