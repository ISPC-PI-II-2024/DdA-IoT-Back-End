// ==========================
// Rutas de autenticación
// ==========================
import { Router } from "express";
import { googleAuth } from "../controllers/auth.controllers.js";

const router = Router();

router.post("/google", googleAuth);

export default router;
