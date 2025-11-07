// ==========================
// Página de Inicio (Home/Landing Page)
// - Punto de entrada después del login
// - Landing page explicativa del proyecto
// - Secciones: General, Agro, Edge, Backend, Web App, Análisis de Datos
// ==========================
import { el } from "../utils/dom.js";
import { getState } from "../state/store.js";

export async function render() {
  const state = getState();
  const currentProject = state.currentProject;

  // Crear menú de navegación con botón hamburguesa (mismo formato que dashboard)
  const homeNav = el("nav", { class: "dashboard-nav-menu" },
    el("button", { 
      class: "dashboard-nav-toggle",
      id: "home-nav-toggle",
      "aria-label": "Abrir menú de navegación",
      onclick: () => {
        const menu = homeNav;
        const overlay = document.getElementById('home-nav-overlay');
        if (menu && overlay) {
          menu.classList.toggle('mobile-menu');
          menu.classList.toggle('active');
          overlay.classList.toggle('active');
          const toggleBtn = document.getElementById('home-nav-toggle');
          if (toggleBtn) {
            toggleBtn.textContent = menu.classList.contains('active') ? '✕' : '☰';
          }
        }
      }
    }, "☰"),
    el("div", { class: "dashboard-nav-overlay", id: "home-nav-overlay", onclick: () => {
      const menu = homeNav;
      const overlay = document.getElementById('home-nav-overlay');
      if (menu && overlay) {
        menu.classList.remove('mobile-menu', 'active');
        overlay.classList.remove('active');
        const toggleBtn = document.getElementById('home-nav-toggle');
        if (toggleBtn) {
          toggleBtn.textContent = '☰';
        }
      }
    }}),
    el("ul", {},
      el("li", {},
        el("a", { href: "#home-header", "data-section": "header" }, "🏠 Inicio")
      ),
      el("li", {},
        el("a", { href: "#home-general", "data-section": "general" }, "📋 General")
      ),
      el("li", {},
        el("a", { href: "#home-agro", "data-section": "agro" }, "🌾 Agro")
      ),
      el("li", {},
        el("a", { href: "#home-edge", "data-section": "edge" }, "🔌 Edge")
      ),
      el("li", {},
        el("a", { href: "#home-backend", "data-section": "backend" }, "⚙️ Backend")
      ),
      el("li", {},
        el("a", { href: "#home-webapp", "data-section": "webapp" }, "🌐 Web App")
      ),
      el("li", {},
        el("a", { href: "#home-analisis", "data-section": "analisis" }, "📊 Análisis de Datos")
      )
    )
  );

  // Header
  const header = el("div", { 
    id: "home-header",
    class: "dashboard-section dashboard-header card card-feature" 
  },
    el("h1", { class: "text-3xl font-bold mb-3" }, "Sistema IoT para Monitoreo Agrícola"),
    el("p", { class: "muted text-lg mb-2" }, `Proyecto: ${currentProject ?? "Sistema IoT"}`),
    el("p", { class: "text-base" }, "Solución completa de Internet de las Cosas para el monitoreo en tiempo real de condiciones ambientales en entornos agrícolas")
  );

  // Sección General
  const sectionGeneral = el("div", {
    id: "home-general",
    class: "dashboard-section card",
    style: "margin-top: 20px;"
  },
    el("h2", { class: "text-2xl font-bold mb-4", style: "border-bottom: 2px solid #0284c7; padding-bottom: 10px;" }, "📋 Visión General del Proyecto"),
    el("div", { class: "grid cols-2", style: "gap: 20px; margin-top: 20px;" },
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Descripción"),
        el("p", { class: "mb-3" }, 
          "Este proyecto implementa una solución IoT completa para el monitoreo de condiciones ambientales " +
          "en entornos agrícolas. El sistema permite la recolección, transmisión, almacenamiento y visualización " +
          "de datos de sensores en tiempo real."
        ),
        el("p", { class: "mb-3" },
          "La arquitectura del sistema está diseñada para ser escalable, robusta y fácil de mantener, " +
          "utilizando tecnologías modernas y estándares de la industria."
        )
      ),
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Arquitectura"),
        el("p", { class: "mb-3" },
          "El sistema está compuesto por múltiples capas que trabajan en conjunto:"
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px;" },
          el("li", {}, "Dispositivos Edge (sensores, endpoints, gateways)"),
          el("li", {}, "Backend con APIs REST y WebSocket"),
          el("li", {}, "Base de datos relacional y time-series"),
          el("li", {}, "Frontend web responsive"),
          el("li", {}, "Herramientas de análisis y visualización")
        )
      )
    ),
    el("div", { style: "margin-top: 20px; text-align: center;" },
      (() => {
        const img = el("img", {
          src: "/images/arquitectura-general.jpg",
          alt: "Arquitectura General del Sistema",
          style: "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);",
          onerror: "this.style.display='none';"
        });
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
        return img;
      })()
    )
  );

  // Sección Agro
  const sectionAgro = el("div", {
    id: "home-agro",
    class: "dashboard-section card",
    style: "margin-top: 20px;"
  },
    el("h2", { class: "text-2xl font-bold mb-4", style: "border-bottom: 2px solid #16a34a; padding-bottom: 10px;" }, "🌾 Aplicación Agrícola"),
    el("div", { class: "grid cols-2", style: "gap: 20px; margin-top: 20px;" },
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Contexto"),
        el("p", { class: "mb-3" },
          "La agricultura moderna requiere monitoreo constante de variables ambientales como temperatura, " +
          "humedad, pH del suelo, y otros parámetros críticos para optimizar la producción."
        ),
        el("p", { class: "mb-3" },
          "Este sistema IoT permite a los agricultores y técnicos agrícolas monitorear sus cultivos " +
          "en tiempo real desde cualquier lugar, recibiendo alertas cuando las condiciones se salen " +
          "de los rangos óptimos."
        )
      ),
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Beneficios"),
        el("ul", { style: "list-style: disc; padding-left: 20px;" },
          el("li", {}, "Monitoreo continuo 24/7"),
          el("li", {}, "Alertas tempranas de condiciones adversas"),
          el("li", {}, "Historial de datos para análisis de tendencias"),
          el("li", {}, "Optimización del uso de recursos"),
          el("li", {}, "Reducción de pérdidas por condiciones climáticas")
        )
      )
    ),
    el("div", { style: "margin-top: 20px; text-align: center;" },
      (() => {
        const img = el("img", {
          src: "/images/aplicacion-agro.jpg",
          alt: "Aplicación Agrícola",
          style: "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        });
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
        return img;
      })()
    ),
    el("div", { style: "margin-top: 15px; text-align: center;" },
      el("a", {
        href: "https://github.com/ispc2025/iot-agro",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-primary",
        style: "margin-right: 10px;"
      }, "🔗 Repositorio GitHub"),
      el("a", {
        href: "/docs/agro-guide.pdf",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-secondary"
      }, "📄 Documentación")
    )
  );

  // Sección Edge
  const sectionEdge = el("div", {
    id: "home-edge",
    class: "dashboard-section card",
    style: "margin-top: 20px;"
  },
    el("h2", { class: "text-2xl font-bold mb-4", style: "border-bottom: 2px solid #f59e0b; padding-bottom: 10px;" }, "🔌 Dispositivos Edge"),
    el("div", { class: "grid cols-2", style: "gap: 20px; margin-top: 20px;" },
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Componentes Hardware"),
        el("p", { class: "mb-3" },
          "El sistema utiliza dispositivos ESP32 como base para los sensores y endpoints. " +
          "Estos dispositivos son económicos, eficientes energéticamente y cuentan con conectividad WiFi y LoRa."
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px; margin-top: 10px;" },
          el("li", {}, "ESP32 con WiFi y LoRa"),
          el("li", {}, "Sensores de temperatura y humedad DHT22"),
          el("li", {}, "Gateways LoRa para comunicación de largo alcance"),
          el("li", {}, "Endpoints intermedios para agregación de datos")
        )
      ),
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Comunicación"),
        el("p", { class: "mb-3" },
          "Los dispositivos utilizan MQTT sobre WiFi para comunicación en tiempo real con el backend. " +
          "Para áreas remotas, se implementa comunicación LoRa para reducir el consumo energético."
        ),
        el("p", { class: "mb-3" },
          "El protocolo MQTT garantiza entrega confiable de mensajes y permite la suscripción " +
          "a tópicos específicos para filtrado eficiente de datos."
        )
      )
    ),
    el("div", { style: "margin-top: 20px; text-align: center;" },
      (() => {
        const img = el("img", {
          src: "/images/dispositivos-edge.jpg",
          alt: "Dispositivos Edge",
          style: "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        });
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
        return img;
      })()
    ),
    el("div", { style: "margin-top: 15px; text-align: center;" },
      el("a", {
        href: "https://github.com/ispc2025/iot-edge",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-primary"
      }, "🔗 Código Firmware")
    )
  );

  // Sección Backend
  const sectionBackend = el("div", {
    id: "home-backend",
    class: "dashboard-section card",
    style: "margin-top: 20px;"
  },
    el("h2", { class: "text-2xl font-bold mb-4", style: "border-bottom: 2px solid #dc2626; padding-bottom: 10px;" }, "⚙️ Backend"),
    el("div", { class: "grid cols-2", style: "gap: 20px; margin-top: 20px;" },
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Tecnologías"),
        el("p", { class: "mb-3" },
          "El backend está construido con Node.js y Express.js, proporcionando APIs RESTful " +
          "y soporte para WebSocket para comunicación en tiempo real."
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px; margin-top: 10px;" },
          el("li", {}, "Node.js 20 con Express.js"),
          el("li", {}, "MQTT Broker (Mosquitto)"),
          el("li", {}, "MariaDB para datos relacionales"),
          el("li", {}, "InfluxDB para time-series"),
          el("li", {}, "Autenticación JWT y OAuth Google"),
          el("li", {}, "WebSocket para actualizaciones en tiempo real")
        )
      ),
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Arquitectura"),
        el("p", { class: "mb-3" },
          "El backend sigue una arquitectura MVC con separación clara de responsabilidades. " +
          "Utiliza Docker para containerización y facilitar el despliegue."
        ),
        el("p", { class: "mb-3" },
          "Los datos de sensores se almacenan tanto en MariaDB (metadatos) como en InfluxDB " +
          "(datos time-series) para optimizar consultas y almacenamiento."
        )
      )
    ),
    el("div", { style: "margin-top: 20px; text-align: center;" },
      (() => {
        const img = el("img", {
          src: "/images/backend-architecture.jpg",
          alt: "Arquitectura Backend",
          style: "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        });
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
        return img;
      })()
    ),
    el("div", { style: "margin-top: 15px; text-align: center;" },
      el("a", {
        href: "https://github.com/ispc2025/iot-backend",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-primary",
        style: "margin-right: 10px;"
      }, "🔗 Repositorio Backend"),
      el("a", {
        href: "/api/docs",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-secondary"
      }, "📚 API Documentation")
    )
  );

  // Sección Web App
  const sectionWebApp = el("div", {
    id: "home-webapp",
    class: "dashboard-section card",
    style: "margin-top: 20px;"
  },
    el("h2", { class: "text-2xl font-bold mb-4", style: "border-bottom: 2px solid #7c3aed; padding-bottom: 10px;" }, "🌐 Web Application"),
    el("div", { class: "grid cols-2", style: "gap: 20px; margin-top: 20px;" },
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Frontend"),
        el("p", { class: "mb-3" },
          "La aplicación web está construida con Vanilla JavaScript (ES modules) siguiendo " +
          "una arquitectura de Single Page Application (SPA). No utiliza frameworks pesados, " +
          "lo que garantiza un rendimiento óptimo y carga rápida."
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px; margin-top: 10px;" },
          el("li", {}, "Vanilla JavaScript ES6+"),
          el("li", {}, "Progressive Web App (PWA)"),
          el("li", {}, "WebSocket para datos en tiempo real"),
          el("li", {}, "Gráficos canvas personalizados"),
          el("li", {}, "Diseño responsive y mobile-first")
        )
      ),
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Características"),
        el("p", { class: "mb-3" },
          "La aplicación incluye dashboards interactivos, visualización de datos históricos, " +
          "sistema de alertas configurable, y gestión de dispositivos."
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px; margin-top: 10px;" },
          el("li", {}, "Dashboard en tiempo real"),
          el("li", {}, "Gráficos de series temporales"),
          el("li", {}, "Filtros de tiempo tipo Grafana"),
          el("li", {}, "Sistema de alertas y notificaciones"),
          el("li", {}, "Gestión de configuración avanzada")
        )
      )
    ),
    el("div", { style: "margin-top: 20px; text-align: center;" },
      (() => {
        const img = el("img", {
          src: "/images/webapp-screenshot.jpg",
          alt: "Web Application Screenshot",
          style: "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        });
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
        return img;
      })()
    ),
    el("div", { style: "margin-top: 15px; text-align: center;" },
      el("a", {
        href: "https://github.com/ispc2025/iot-frontend",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-primary"
      }, "🔗 Repositorio Frontend")
    )
  );

  // Sección Análisis de Datos
  const sectionAnalisis = el("div", {
    id: "home-analisis",
    class: "dashboard-section card",
    style: "margin-top: 20px;"
  },
    el("h2", { class: "text-2xl font-bold mb-4", style: "border-bottom: 2px solid #0891b2; padding-bottom: 10px;" }, "📊 Análisis de Datos"),
    el("div", { class: "grid cols-2", style: "gap: 20px; margin-top: 20px;" },
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Herramientas"),
        el("p", { class: "mb-3" },
          "El sistema integra múltiples herramientas para el análisis y visualización de datos:"
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px; margin-top: 10px;" },
          el("li", {}, "Grafana para dashboards avanzados"),
          el("li", {}, "InfluxDB para almacenamiento time-series"),
          el("li", {}, "Telegraf para recolección de datos"),
          el("li", {}, "Node-RED para flujos de datos"),
          el("li", {}, "APIs REST para consultas personalizadas")
        )
      ),
      el("div", {},
        el("h3", { class: "text-xl font-semibold mb-3" }, "Capacidades"),
        el("p", { class: "mb-3" },
          "El sistema permite realizar análisis históricos, identificar tendencias, " +
          "y generar reportes automáticos basados en los datos recolectados."
        ),
        el("ul", { style: "list-style: disc; padding-left: 20px; margin-top: 10px;" },
          el("li", {}, "Análisis de tendencias temporales"),
          el("li", {}, "Detección de anomalías"),
          el("li", {}, "Reportes personalizables"),
          el("li", {}, "Exportación de datos"),
          el("li", {}, "Visualizaciones interactivas")
        )
      )
    ),
    el("div", { style: "margin-top: 20px; text-align: center;" },
      (() => {
        const img = el("img", {
          src: "/images/analisis-datos.jpg",
          alt: "Análisis de Datos",
          style: "max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        });
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
        return img;
      })()
    ),
    el("div", { style: "margin-top: 15px; text-align: center;" },
      el("a", {
        href: "http://localhost:3001",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-primary",
        style: "margin-right: 10px;"
      }, "📊 Grafana Dashboard"),
      el("a", {
        href: "http://localhost:1880",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "btn btn-secondary"
      }, "🔄 Node-RED")
    )
  );

  // Contenedor principal
  const homeContainer = el("div", { class: "dashboard-container" });
  homeContainer.appendChild(header);
  homeContainer.appendChild(sectionGeneral);
  homeContainer.appendChild(sectionAgro);
  homeContainer.appendChild(sectionEdge);
  homeContainer.appendChild(sectionBackend);
  homeContainer.appendChild(sectionWebApp);
  homeContainer.appendChild(sectionAnalisis);

  // Configurar navegación después de que el DOM esté listo
  setTimeout(() => {
    const navLinks = document.querySelectorAll('.dashboard-nav-menu a[data-section]');
    const sections = document.querySelectorAll('.dashboard-section');
    
    function updateActiveLink() {
      const scrollPos = window.scrollY + 100;
      
      sections.forEach((section) => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        
        if (scrollPos >= top && scrollPos < bottom) {
          navLinks.forEach(link => link.classList.remove('active'));
          const sectionId = section.id ? section.id.replace('home-', '') : '';
          const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }
      });
    }
    
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
          const navMenu = document.querySelector('.dashboard-nav-menu');
          const navbar = document.querySelector('.navbar');
          const offsetTop = target.offsetTop - (navMenu ? navMenu.offsetHeight : 0) - (navbar ? navbar.offsetHeight : 0);
          const scrollOptions = {
            top: offsetTop,
            behavior: 'smooth'
          };
          window.scrollTo(scrollOptions);
          
          if (navMenu && navMenu.classList.contains('mobile-menu')) {
            const overlay = document.getElementById('home-nav-overlay');
            navMenu.classList.remove('mobile-menu', 'active');
            if (overlay) overlay.classList.remove('active');
            const toggleBtn = document.getElementById('home-nav-toggle');
            if (toggleBtn) toggleBtn.textContent = '☰';
          }
        }
      });
    });
    
    window.__homeNavScrollHandler = updateActiveLink;
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
  }, 100);

  const pageContainer = el("div", {});
  pageContainer.appendChild(homeNav);
  pageContainer.appendChild(homeContainer);
  
  const cleanupHome = () => {
    if (window.__homeNavScrollHandler) {
      window.removeEventListener('scroll', window.__homeNavScrollHandler);
      window.__homeNavScrollHandler = null;
    }
  };
  
  pageContainer.cleanup = cleanupHome;
  
  return pageContainer;
}

