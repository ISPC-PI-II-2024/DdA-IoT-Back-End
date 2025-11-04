// ==========================
// Bootstrap de la App
// - Renderiza navbar y arranca router
// - Suscribe a store para refrescar navbar cuando cambie sesión/rol
// ==========================
import { renderNavbar } from "./components/navbar.js";
import { initRouter } from "./router/index.js";
import { renderFooter } from "./components/footer.js";
import { initSession } from "./api.js";

async function initApp() {
  // Inicializar sesión si existe
  await initSession();
  
  renderNavbar();   // pinta navbar inicial
  initRouter();     // monta router/guards
  document.body.appendChild(renderFooter());  // aplica el footer
}

initApp();


