// ==========================
// Rutas de configuración del sistema
// - GET /api/config/general - Configuración general (todos los autenticados)
// - GET /api/config/advanced - Configuración avanzada (solo admin)
// - PUT /api/config/advanced - Actualizar configuración avanzada (solo admin)
// - GET /api/config/mqtt/status - Estado de MQTT
// - POST /api/config/mqtt/restart - Reiniciar MQTT (solo admin)
// - POST /api/config/cache/clear - Limpiar cache (solo admin)
// ==========================

import { Router } from "express";
import { 
  getGeneralConfig,
  getAdvancedConfig,
  updateAdvancedConfig,
  getMQTTStatus,
  restartMQTTConnection,
  clearDataCache,
  reloadMQTTTopics,
  getMQTTTopics,
  createMQTTTopic,
  updateMQTTTopic,
  deleteMQTTTopic
} from "../controllers/config.controllers.js";
import { requireAuth, requireRole } from "../middlewares/auth.middlewares.js";

const router = Router();

// Configuración general - todos los usuarios autenticados
router.get("/general", requireAuth, getGeneralConfig);

// Configuración avanzada - solo admin
router.get("/advanced", requireAuth, requireRole(["admin"]), getAdvancedConfig);
router.put("/advanced", requireAuth, requireRole(["admin"]), updateAdvancedConfig);

// Estado y acciones administrativas
router.get("/mqtt/status", requireAuth, getMQTTStatus);
router.get("/mqtt/topics", requireAuth, getMQTTTopics);
router.post("/mqtt/restart", requireAuth, requireRole(["admin"]), restartMQTTConnection);
router.post("/mqtt/reload-topics", requireAuth, requireRole(["admin"]), reloadMQTTTopics);
router.post("/cache/clear", requireAuth, requireRole(["admin"]), clearDataCache);

// CRUD de tópicos MQTT (solo admin)
router.post("/mqtt/topics", requireAuth, requireRole(["admin"]), createMQTTTopic);
router.put("/mqtt/topics/:id", requireAuth, requireRole(["admin"]), updateMQTTTopic);
router.delete("/mqtt/topics/:id", requireAuth, requireRole(["admin"]), deleteMQTTTopic);

export default router
