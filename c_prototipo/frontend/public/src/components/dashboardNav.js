// ==========================
// Componente de Navegación del Dashboard
// Menú de navegación con botón hamburguesa y scroll suave
// ==========================

import { el } from "../utils/dom.js";

export function createDashboardNav() {
  const dashboardNav = el("nav", { class: "dashboard-nav-menu" });
  
  // Función auxiliar para toggle del menú
  const toggleMenu = () => {
    const menu = dashboardNav;
    const overlay = document.getElementById('dashboard-nav-overlay');
    if (menu && overlay) {
      menu.classList.toggle('mobile-menu');
      menu.classList.toggle('active');
      overlay.classList.toggle('active');
      const toggleBtn = document.getElementById('dashboard-nav-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = menu.classList.contains('active') ? '✕' : '☰';
      }
    }
  };
  
  // Función auxiliar para cerrar el menú
  const closeMenu = () => {
    const menu = dashboardNav;
    const overlay = document.getElementById('dashboard-nav-overlay');
    if (menu && overlay) {
      menu.classList.remove('mobile-menu', 'active');
      overlay.classList.remove('active');
      const toggleBtn = document.getElementById('dashboard-nav-toggle');
      if (toggleBtn) {
        toggleBtn.textContent = '☰';
      }
    }
  };
  
  // Crear botón toggle
  const toggleButton = el("button", { 
    class: "dashboard-nav-toggle",
    id: "dashboard-nav-toggle"
  }, "☰");
  toggleButton.setAttribute("aria-label", "Abrir menú de navegación");
  toggleButton.addEventListener('click', toggleMenu);
  
  // Crear overlay
  const overlay = el("div", { 
    class: "dashboard-nav-overlay", 
    id: "dashboard-nav-overlay" 
  });
  overlay.addEventListener('click', closeMenu);
  
  // Crear lista de navegación
  const navList = el("ul", {},
    el("li", {},
      el("a", { href: "#dashboard-header", "data-section": "header" }, "📊 Inicio")
    ),
    el("li", {},
      el("a", { href: "#dashboard-general-status", "data-section": "general-status" }, "⚡ Estado General")
    ),
    el("li", {},
      el("a", { href: "#dashboard-system-status", "data-section": "system-status" }, "🔧 Sistema")
    ),
    el("li", {},
      el("a", { href: "#dashboard-alerts", "data-section": "alerts" }, "⚠️ Alertas")
    ),
    el("li", {},
      el("a", { href: "#dashboard-device-selector", "data-section": "device-selector" }, "📱 Dispositivos")
    ),
    el("li", {},
      el("a", { href: "#dashboard-hierarchy", "data-section": "hierarchy" }, "🌐 Jerarquía")
    ),
    el("li", {},
      el("a", { href: "#dashboard-mqtt-logs", "data-section": "mqtt-logs" }, "📡 Logs MQTT")
    )
  );
  
  // Agregar elementos al nav
  dashboardNav.appendChild(toggleButton);
  dashboardNav.appendChild(overlay);
  dashboardNav.appendChild(navList);
  
  // Configurar navegación después de que el DOM esté listo
  setTimeout(() => {
    const navLinks = dashboardNav.querySelectorAll('a[href^="#"]');
    const navMenu = dashboardNav;
    
    // Función para actualizar link activo
    function updateActiveLink() {
      const sections = document.querySelectorAll('[id^="dashboard-"]');
      const scrollPos = window.scrollY + 100;
      
      sections.forEach(section => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        const id = section.id;
        
        if (scrollPos >= top && scrollPos < bottom) {
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }
    
    // Event listeners para navegación
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          const target = document.querySelector(targetId);
          if (target) {
            const offsetTop = target.offsetTop - 80;
            const scrollOptions = {
              top: offsetTop,
              behavior: 'smooth'
            };
            window.scrollTo(scrollOptions);
            
            // Cerrar menú móvil si está abierto
            if (navMenu && navMenu.classList.contains('mobile-menu')) {
              const overlay = document.getElementById('dashboard-nav-overlay');
              navMenu.classList.remove('mobile-menu', 'active');
              if (overlay) overlay.classList.remove('active');
              const toggleBtn = document.getElementById('dashboard-nav-toggle');
              if (toggleBtn) toggleBtn.textContent = '☰';
            }
          }
        }
      });
    });
    
    // Configurar scroll handler
    window.__dashboardNavScrollHandler = updateActiveLink;
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink(); // Inicial
  }, 100);
  
  return dashboardNav;
}

export function cleanupDashboardNav() {
  if (window.__dashboardNavScrollHandler) {
    window.removeEventListener('scroll', window.__dashboardNavScrollHandler);
    window.__dashboardNavScrollHandler = null;
  }
}

