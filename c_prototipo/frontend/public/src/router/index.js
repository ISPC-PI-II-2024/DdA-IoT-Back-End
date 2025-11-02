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
  "dispositivos": { view: () => import("../pages/dispositivos.js").then(m => m.render), meta: { roles: [ROLES_CONST.ADMIN, ROLES_CONST.ACTION, ROLES_CONST.READONLY] } },
  "dashboard": { view: () => import("../pages/dashboard.js").then(m => m.render),    meta: { roles: [ROLES_CONST.ADMIN, ROLES_CONST.ACTION, ROLES_CONST.READONLY] } },
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
    const { role, user } = getState();
    const hash = parseHash();
    if (!canAccess(hash, role, !!user)) {
      location.hash = "#/login";
      return;
    }
    const def = routes[hash] || routes["404"];
    const render = await def.view();
    mount(app, await render());
    // Marca activa en navbar (si existe)
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-nav") === hash);
    });
  };

  window.addEventListener("hashchange", navigate);
  navigate();
}

// Exportar función navigate para uso en otras páginas
export function navigate(path) {
  location.hash = `#/${path}`;
}
