// ==========================
// Rutas públicas para usuarios
// ==========================
import { Router } from "express";
import { getUsersByTecnicaturaController } from "../controllers/user.controllers.js";

const router = Router();

// Ruta pública - no requiere autenticación
router.get("/users/by-tecnicatura", getUsersByTecnicaturaController);

export default router;

