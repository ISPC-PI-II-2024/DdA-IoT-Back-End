// ==========================
// Ruta de configuración pública
// Exponen valores necesarios para el frontend
// ==========================
import { Router } from "express";
import { ENV } from "../config/env.js";

const router = Router();

router.get("/config", (req, res) => {
  res.json({
    GOOGLE_CLIENT_ID: ENV.GOOGLE_CLIENT_ID
  });
});

export default router;


