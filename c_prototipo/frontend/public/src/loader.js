// loader.js — carga config y arranca la app, con fallback si /config.json no existe
const defaults = {
  // Usar URLs relativas por defecto para funcionar detrás de proxy
  API_URL: "/api",
  WS_URL: "/ws",
  GOOGLE_CLIENT_ID: "",
  ROLES: { ADMIN: "admin", ACTION: "action", READONLY: "readonly", GUEST: "guest" }
};

async function loadConfig() {
  // 1) Leer config.json (si existe) para obtener API_URL/WS_URL
  let cfgFromJson = null;
  try {
    const rCfg = await fetch("/config.json", { cache: "no-store" });
    if (rCfg.ok) cfgFromJson = await rCfg.json().catch(() => null);
  } catch {}

  const base = cfgFromJson && typeof cfgFromJson === "object" ? { ...defaults, ...cfgFromJson } : { ...defaults };

  // 2) Intentar obtener GOOGLE_CLIENT_ID del backend
  // 2a) Si no hay proxy en el mismo origen, usar API_URL/config
  const apiUrl = (base.API_URL || defaults.API_URL).replace(/\/$/, "");
  const backendConfigUrl = `${apiUrl}/config`;

  let googleClientId = "";

  // 2b) Intentar primero API_URL/config
  try {
    const r = await fetch(backendConfigUrl, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j && j.GOOGLE_CLIENT_ID) googleClientId = j.GOOGLE_CLIENT_ID;
    }
  } catch {}

  // 2c) Intentar además mismo origen /api/config por si hay proxy
  if (!googleClientId) {
    try {
      const rLocal = await fetch("/api/config", { cache: "no-store" });
      if (rLocal.ok) {
        const j = await rLocal.json().catch(() => ({}));
        if (j && j.GOOGLE_CLIENT_ID) googleClientId = j.GOOGLE_CLIENT_ID;
      }
    } catch {}
  }

  const finalCfg = { ...base };
  if (googleClientId) finalCfg.GOOGLE_CLIENT_ID = googleClientId;

  return finalCfg;
}

window.__CONFIG = await loadConfig();
await import("./app.js");
