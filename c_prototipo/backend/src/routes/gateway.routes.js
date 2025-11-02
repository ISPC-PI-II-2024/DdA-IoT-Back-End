// ==========================
// Rutas para datos de gateway, endpoints y sensores
// ==========================
import { Router } from "express";
import { 
  getAllGateways,
  getGatewayById,
  getAllEndpoints,
  getEndpointById,
  getAllSensors,
  getSensorById,
  getSensorsByEndpoint,
  getThresholds,
  updateThresholds,
  getSystemStatus
} from "../controllers/gateway.controllers.js";
import { requireAuth, requireRole } from "../middlewares/auth.middlewares.js";

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// ==========================
// GATEWAY ROUTES
// ==========================

// Obtener todos los gateways
router.get("/gateways", getAllGateways);

// Obtener gateway específico con sus endpoints
router.get("/gateways/:gatewayId", getGatewayById);

// ==========================
// ENDPOINT ROUTES
// ==========================

// Obtener todos los endpoints
router.get("/endpoints", getAllEndpoints);

// Obtener endpoint específico con sus sensores
router.get("/endpoints/:endpointId", getEndpointById);

// ==========================
// SENSOR ROUTES
// ==========================

// Obtener todos los sensores
router.get("/sensors", getAllSensors);

// Obtener sensor específico
router.get("/sensors/:sensorId", getSensorById);

// Obtener sensores por endpoint
router.get("/endpoints/:endpointId/sensors", getSensorsByEndpoint);

// ==========================
// THRESHOLDS ROUTES
// ==========================

// Obtener umbrales actuales
router.get("/thresholds", getThresholds);

// Actualizar umbrales (solo admin)
router.put("/thresholds", requireRole(["admin"]), updateThresholds);

// ==========================
// STATUS ROUTES
// ==========================

// Obtener estado completo del sistema
router.get("/status", getSystemStatus);

export default router;
