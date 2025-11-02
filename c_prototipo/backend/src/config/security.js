// ==========================
// Helmet + políticas básicas
// Nota: La CSP fina la definís en el reverse-proxy
// ==========================
import helmet from "helmet";

export function security(app) {
  app.use(helmet({
    // Dejá la CSP al proxy para permitir GIS y ajustar nonces/hashes.
    contentSecurityPolicy: false
  }));
}
