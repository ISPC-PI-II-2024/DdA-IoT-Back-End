// ==========================
// Login con Google (GIS)
// - Carga dinámica de script GIS si falta
// - Renderiza botón y maneja callback
// - Dev fallback: login simulado por rol (opcional)
// ==========================
import { el } from "../utils/dom.js";
import { setState } from "../state/store.js";
import { AuthAPI, setSession } from "../api.js";

function loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar GIS"));
    document.head.appendChild(s);
  });
}

async function initGoogle(container) {
  const { GOOGLE_CLIENT_ID } = window.__CONFIG || {};
  if (!GOOGLE_CLIENT_ID) {
    container.appendChild(el("p", { class: "error" }, "Falta GOOGLE_CLIENT_ID en la configuración. Verificá que /api/config lo devuelva y que el .env raíz tenga el valor correcto."));
    return;
  }
  await loadGIS();

  // Inicializar GIS
  /* global google */
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async (resp) => {
      try {
        const data = await AuthAPI.googleLogin(resp.credential);
        setSession(data); // guarda token + user + role y setState()
        
        // Esperar un momento para que el estado se actualice completamente
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Redirigir explícitamente sin recargar
        window.location.hash = "#/dashboard";
        
        // Trigger hashchange para asegurar que se detecte
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } catch (e) {
        console.error(e);
        alert("No se pudo iniciar sesión con Google.");
      }
    },
    auto_select: false,
    ux_mode: "popup" // o "redirect"
  });

  // Renderizar botón
  const btn = el("div", { id: "google-btn" });
  container.appendChild(btn);

  window.google.accounts.id.renderButton(btn, {
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with"
  });
}

export async function render() {
  const root = el("div", { class: "container" },
    el("div", { class: "card" },
      el("h2", {}, "Ingresar"),
      el("p", { class: "muted" }, "Usá tu cuenta de Google para acceder. Requiere HTTPS en producción.")
    )
  );


  // Contenedor para GIS
  try {
    await initGoogle(root);
  } catch (error) {
    console.error("Error inicializando Google:", error);
    // Continuar aunque falle Google
  }

  return root;
}
