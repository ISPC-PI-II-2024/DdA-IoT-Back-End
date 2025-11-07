// ==========================
// Router hash + Guards por rol
// - Definición de rutas con meta.roles permitidos
// - beforeEach: redirige si no cumple rol/sesión
// ==========================
import { mount, el } from "../utils/dom.js";
import { getState, ROLES_CONST } from "../state/store.js";

const routes = {
  "":          { view: () => import("../pages/login.js").then(m => m.render),        meta: { public: true } },
  "login":     { view: () => import("../pages/login.js").then(m => m.render),        meta: { public: true } },
  "home":      { view: () => import("../pages/home.js").then(m => m.render),          meta: { public: true } },
  "dispositivos": { view: () => import("../pages/dispositivos.js").then(m => m.render), meta: { roles: [ROLES_CONST.ADMIN, ROLES_CONST.ACTION, ROLES_CONST.READONLY] } },
  "dashboard": { view: () => import("../pages/dashboard.js").then(m => m.render),    meta: { public: true } }, // Dashboard público pero requiere autenticación para funcionalidad completa
  "sobre-nosotros": { view: () => import("../pages/sobreNosotros.js").then(m => m.render), meta: { public: true } },
  "configuracion": { view: () => import("../pages/configuracion.js").then(m => m.render), meta: { roles: [ROLES_CONST.ADMIN, ROLES_CONST.ACTION, ROLES_CONST.READONLY] } },
  "configuracion/avanzada": { view: () => import("../pages/configuracionAvanzada.js").then(m => m.render), meta: { roles: [ROLES_CONST.ADMIN] } },
  "404":       { view: () => import("../pages/notFound.js").then(m => m.render),     meta: { public: true } }
};

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  return h || "login";
}

function canAccess(hash, role, isLogged) {
  const def = routes[hash] || routes["404"];
  const { meta = {} } = def;
  if (meta.public) return true;
  if (!isLogged) return false;
  if (!meta.roles) return true;
  return meta.roles.includes(role);
}

export function initRouter() {
  const app = document.getElementById("app");

  const navigate = async () => {
    try {
      const state = getState();
      const role = state.role;
      const user = state.user;
      const hash = parseHash();
      
      console.log('[Router] Navegando a:', hash);
      console.log('[Router] Rol:', role);
      console.log('[Router] Usuario:', !!user);
      
      if (!canAccess(hash, role, !!user)) {
        console.log('[Router] Acceso denegado, redirigiendo a login');
        location.hash = "#/login";
        return;
      }
      
      const def = routes[hash] || routes["404"];
      if (!def) {
        console.error('[Router] Ruta no encontrada:', hash);
        location.hash = "#/404";
        return;
      }
      
      console.log('[Router] Cargando vista para:', hash);
      let render;
      try {
        render = await def.view();
      } catch (importError) {
        console.error('[Router] Error importando módulo:', hash);
        console.error('[Router] Tipo de error:', importError.name);
        console.error('[Router] Mensaje:', importError.message);
        if (importError.stack) {
          const stackLines = importError.stack.split('\n').slice(0, 15);
          console.error('[Router] Stack trace (primeras 15 líneas):');
          stackLines.forEach(line => console.error('[Router]', line));
        }
        if (importError.fileName) {
          console.error('[Router] Archivo:', importError.fileName);
        }
        if (importError.lineNumber) {
          console.error('[Router] Línea:', importError.lineNumber);
        }
        location.hash = "#/404";
        return;
      }
      
      if (!render) {
        console.error('[Router] No se pudo cargar la vista para:', hash);
        location.hash = "#/404";
        return;
      }
      
      const rendered = await render();
      if (!rendered) {
        console.error('[Router] La vista no devolvió contenido para:', hash);
        return;
      }
      
      // Limpiar vista anterior si tiene función de limpieza
      const existingView = app.firstElementChild;
      if (existingView && existingView.cleanup && typeof existingView.cleanup === 'function') {
        try {
          existingView.cleanup();
        } catch (cleanupError) {
          console.warn('[Router] Error en limpieza de vista anterior:', cleanupError);
        }
      }
      
      // Limpiar flags globales del dashboard si existen
      if (window.__dashboardNavInitialized) {
        window.__dashboardNavInitialized = false;
      }
      if (window.__dashboardNavScrollHandler) {
        window.removeEventListener('scroll', window.__dashboardNavScrollHandler);
        window.__dashboardNavScrollHandler = null;
      }
      
      mount(app, rendered);
      
      // Marca activa en navbar (si existe)
      document.querySelectorAll('[data-nav]').forEach(a => {
        a.classList.toggle("active", a.getAttribute("data-nav") === hash);
      });
      
      console.log('[Router] Navegación completada:', hash);
    } catch (error) {
      console.error('[Router] Error durante navegación:', error);
      location.hash = "#/404";
    }
  };

  window.addEventListener("hashchange", navigate);
  navigate();
}

// Exportar función navigate para uso en otras páginas
export function navigate(path) {
  location.hash = `#/${path}`;
}
