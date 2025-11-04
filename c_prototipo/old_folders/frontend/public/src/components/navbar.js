// ==========================
// Navbar basado en rol
// - Links visibles según permisos
// - Slot derecho: usuario + logout (cuando hay sesión)
// ==========================

import { el } from "../utils/dom.js";
import { getState, subscribe, logout, ROLES_CONST } from "../state/store.js";
import { clearSession, getToken } from "../api.js";
import { rtClient } from "../ws.js";

function navLink(hash, label) {
  return el("a", { href: `#/${hash}`, "data-nav": hash }, label);
}

function buildLeft(role) {
  // Contenedor de navegación con clase esperada por el CSS
  const nav = el("nav", { class: "navbar-nav" });
  
  // Público
  nav.appendChild(navLink("dashboard", "Dashboard"));
  
  // Dispositivos - disponible para todos los roles autenticados
  if (role !== ROLES_CONST.GUEST) {
    nav.appendChild(navLink("dispositivos", "Dispositivos"));
  }
  
  nav.appendChild(navLink("sobre-nosotros", "Sobre Nosotros"));

  // Configuracion - disponible para todos los roles autenticados
  if (role !== ROLES_CONST.GUEST) {
    nav.appendChild(navLink("configuracion", "Configuración"));
  }

  // Admin-only - Configuración avanzada aparecerá dentro de la página de configuración
  if (role === ROLES_CONST.ADMIN) {
    // nav.appendChild(navLink("admin-tools", "Admin"));
  }
  return nav;
}

// Función para realizar logout completo de Google
async function performGoogleLogout() {
  try {
    // Verificar si Google Identity Services está disponible
    if (window.google && window.google.accounts && window.google.accounts.id) {
      // Deshabilitar la selección automática
      window.google.accounts.id.disableAutoSelect();
      
      // Cancelar cualquier sesión activa
      window.google.accounts.id.cancel();
      
      // Limpiar cookies de Google si es posible
      try {
        // Intentar limpiar cookies relacionadas con Google
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('google') || name.includes('gid') || name.includes('gci')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.google.com`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.accounts.google.com`;
          }
        });
      } catch (cookieError) {
        console.warn('No se pudieron limpiar las cookies de Google:', cookieError);
      }
      
      console.log('Logout de Google completado');
    } else {
      console.log('Google Identity Services no está disponible');
    }
  } catch (error) {
    console.warn('Error durante logout de Google:', error);
    // Continuar con el logout local aunque falle el logout de Google
  }
}

function buildRight(user, role) {
  // Contenedor usuario, clase esperada por el CSS
  const userBox = el("div", { class: "navbar-user" });

  if (user) {
    userBox.appendChild(
      el("span", { class: "usuario" }, user.name || user.email)
    );
    userBox.appendChild(
      el(
        "button",
        {
          class: "btn-logout",
          onClick: async (event) => {
            try {
              // Mostrar indicador de logout
              const button = event.target;
              const originalText = button.textContent;
              button.textContent = "Cerrando sesión...";
              button.disabled = true;
              
              // Realizar logout de Google
              await performGoogleLogout();
              
              // Limpiar sesión local
              clearSession();
              logout();
              
              // Cerrar WebSocket si está conectado
              try {
                if (rtClient && rtClient.ws) {
                  rtClient.ws.close();
                  console.log('WebSocket cerrado');
                }
              } catch (wsError) {
                console.warn('Error cerrando WebSocket:', wsError);
              }
              
              // Redirigir a login - el router manejará la navegación
              location.hash = "#/login";
              
            } catch (error) {
              console.error('Error durante logout:', error);
              // Aún así, limpiar la sesión local y redirigir
              clearSession();
              logout();
              
              // Cerrar WebSocket en caso de error
              try {
                if (rtClient && rtClient.ws) {
                  rtClient.ws.close();
                }
              } catch (wsError) {
                console.warn('Error cerrando WebSocket:', wsError);
              }
              
              location.hash = "#/login";
            }
          },
        },
        "Salir"
      )
    );
  } else {
    userBox.appendChild(
      el(
        "button",
        {
          class: "btn-login",
          onClick: () => {
            location.hash = "#/login";
          },
        },
        "Ingresar"
      )
    );
  }
  return userBox;
}

export function renderNavbar() {
  const root = document.getElementById("navbar-root");

  const draw = () => {
    const { user, role } = getState();
    const bar = el(
      "div",
      { class: "navbar" },
      el("div", { class: "navbar-logo" }, "ISPC Desarrollo Aplicaciones"),
      buildLeft(role),
      buildRight(user, role)
    );
    root.innerHTML = "";
    root.appendChild(bar);
  };

  draw();
  return subscribe(draw);
}
