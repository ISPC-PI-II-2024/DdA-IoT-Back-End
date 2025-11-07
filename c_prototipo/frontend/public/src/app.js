// ==========================
// Bootstrap de la App
// - Renderiza navbar y arranca router
// - Suscribe a store para refrescar navbar cuando cambie sesión/rol
// - Tracking de actividad del usuario para mantener sesión activa
// ==========================
import { renderNavbar } from "./components/navbar.js";
import { initRouter } from "./router/index.js";
import { renderFooter } from "./components/footer.js";
import { initSession, updateLastActivity, isSessionExpired, clearSession } from "./api.js";
import { storage } from "./utils/storage.js";
import "./components/alertNotification.js"; // Inicializar sistema de notificaciones push/pop-up

// Sistema de tracking de actividad del usuario
let activityTrackingInterval = null;
let lastActivityCheck = Date.now();

function setupActivityTracking() {
  // Eventos que indican actividad del usuario
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const handleActivity = () => {
    updateLastActivity();
  };
  
  // Agregar listeners a eventos de actividad
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, { passive: true });
  });
  
  // Verificar expiración de sesión cada minuto
  activityTrackingInterval = setInterval(() => {
    if (isSessionExpired()) {
      console.log("[Auth] Sesión expirada por inactividad, limpiando sesión...");
      clearSession();
      // Redirigir al login
      window.location.hash = "#/login";
      // Limpiar interval
      if (activityTrackingInterval) {
        clearInterval(activityTrackingInterval);
        activityTrackingInterval = null;
      }
    }
  }, 60000); // Verificar cada minuto
  
  // Limpiar listeners al cerrar
  window.addEventListener('beforeunload', () => {
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity);
    });
    if (activityTrackingInterval) {
      clearInterval(activityTrackingInterval);
    }
  });
}

async function initApp() {
  // Inicializar sesión si existe
  await initSession();
  
  // Configurar tracking de actividad si hay sesión activa
  const token = storage.get("auth_token", null, false);
  if (token) {
    setupActivityTracking();
  }
  
  renderNavbar();   // pinta navbar inicial
  initRouter();     // monta router/guards
  document.body.appendChild(renderFooter());  // aplica el footer
}

initApp();


