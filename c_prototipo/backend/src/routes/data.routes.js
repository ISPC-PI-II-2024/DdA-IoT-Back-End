// --------------------------------------------------------------------
// Rutas relacionadas con la gestion de datos
// --------------------------------------------------------------------

// IMPORTACIONES
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middlewares.js";
import { 
  getAllDevicesController, 
  getDeviceByIdController, 
  getDeviceSensorDataController,
  getHistoricalDataController
} from "../controllers/data.controllers.js";

// --------------------------------------------------------------------
// FUNCIONES
// --------------------------------------------------------------------
const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// Rutas de dispositivos
router.get("/devices", getAllDevicesController);
router.get("/devices/:deviceId", getDeviceByIdController);
router.get("/devices/:deviceId/sensor-data", getDeviceSensorDataController);

// Ruta para datos históricos desde InfluxDB
router.get("/devices/:deviceId/historical", getHistoricalDataController);

// EXPORTACION
export default router;







