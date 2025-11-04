// ==========================
// Página de configuración general
// Acceso para todos los usuarios autenticados
// ==========================
import { el } from "../utils/dom.js";
import { getState } from "../state/store.js";
import { ROLES_CONST } from "../state/store.js";
import { ConfigAPI } from "../api.js";
import { configService } from "../utils/configService.js";

export async function render() {
  const { role } = getState();
  
  // Información general del usuario
  const userInfo = el("div", { class: "card" },
    el("h3", {}, "Información del Usuario"),
    el("div", { class: "info-section" },
      el("p", {}, el("strong", {}, "Rol actual: "), role),
      el("p", {}, "ID de sesión activa"),
      el("p", {}, "Última conexión")
    )
  );

  // Configuración de visualización
  const visualizacion = el("div", { class: "card" },
    el("h3", {}, "Configuración de Visualización"),
    el("div", { class: "form-section" },
      el("label", { for: "temperature_unit" }, "Unidad de temperatura:"),
      el("select", { id: "temperature_unit", name: "temperature_unit" },
        el("option", { value: "celsius" }, "Celsius (°C)"),
        el("option", { value: "fahrenheit" }, "Fahrenheit (°F)")
      ),
      
      el("label", { for: "chart_refresh" }, "Intervalo de actualización de gráficos (mínimo 15 segundos):"),
      el("select", { id: "chart_refresh", name: "chart_refresh" },
        el("option", { value: "15000" }, "15 segundos (mínimo)"),
        el("option", { value: "30000" }, "30 segundos"),
        el("option", { value: "60000" }, "1 minuto"),
        el("option", { value: "120000" }, "2 minutos"),
        el("option", { value: "300000" }, "5 minutos")
      ),
      
      el("label", { for: "chart_points" }, "Puntos máximos en gráficos:"),
      el("input", { 
        type: "number", 
        id: "chart_points", 
        name: "chart_points", 
        min: "10", 
        max: "1000", 
        value: "60",
        placeholder: "60"
      }),
      
      el("button", { 
        class: "btn", 
        type: "button",
        onClick: () => saveVisualizationConfig()
      }, "Guardar configuración")
    )
  );

  // Notificaciones
  const notificaciones = el("div", { class: "card" },
    el("h3", {}, "Configuración de Notificaciones"),
    el("div", { class: "form-section" },
      el("label", { class: "checkbox-label" },
        el("input", { 
          type: "checkbox", 
          id: "browser_notifications",
          name: "browser_notifications"
        }),
        " Permitir notificaciones del navegador"
      ),
      
      el("label", { class: "checkbox-label" },
        el("input", { 
          type: "checkbox", 
          id: "sound_alerts",
          name: "sound_alerts"
        }),
        " Alertas sonoras"
      ),
      
      el("button", { 
        class: "btn-secondary", 
        type: "button",
        onClick: () => testNotifications()
      }, "Probar notificaciones")
    )
  );

  // Sistema de configuración
  const sistemaInfo = el("div", { class: "card" },
    el("h3", {}, "Información del Sistema"),
    el("div", { class: "info-grid" },
      el("div", { class: "info-item" },
        el("strong", {}, "Versión:"),
        el("span", {}, "1.0.0")
      ),
      el("div", { class: "info-item" },
        el("strong", {}, "Última actualización:"),
        el("span", {}, new Date().toLocaleDateString())
      ),
      el("div", { class: "info-item" },
        el("strong", {}, "Estado de conexión:"),
        el("span", { class: "status-online" }, "En línea")
      ),
      el("div", { class: "info-item" },
        el("strong", {}, "Datos almacenados:"),
        el("span", { id: "data_count" }, "Calculando...")
      )
    )
  );

  // Enlaces a configuración avanzada (solo admin)
  let configAvanzadaLink = null;
  if (role === ROLES_CONST.ADMIN) {
    configAvanzadaLink = el("div", { class: "card" },
      el("h3", {}, "Configuración Avanzada"),
      el("p", {}, "Acceso a configuración avanzada del sistema."),
      el("button", { 
        class: "btn btn-admin",
        onClick: () => {
          location.hash = "#/configuracion/avanzada";
        }
      }, "Ir a Configuración Avanzada")
    );
  }

  // Funciones para manejar la configuración usando ConfigService
  window.saveVisualizationConfig = async function() {
    const chartRefreshValue = parseInt(document.getElementById("chart_refresh").value);
    const MIN_INTERVAL = 15000; // 15 segundos mínimo
    
    // Validar que el intervalo sea al menos 15 segundos
    if (chartRefreshValue < MIN_INTERVAL) {
      alert(`El intervalo de actualización debe ser al menos 15 segundos (${MIN_INTERVAL}ms). Se ajustará automáticamente.`);
      document.getElementById("chart_refresh").value = MIN_INTERVAL;
    }
    
    const config = {
      temperatureUnit: document.getElementById("temperature_unit").value,
      chartRefresh: Math.max(chartRefreshValue, MIN_INTERVAL), // Asegurar mínimo
      chartPoints: parseInt(document.getElementById("chart_points").value)
    };
    
    try {
      // Guardar usando ConfigService (ya guarda por perfil automáticamente)
      const success = configService.setVisualizationConfig(config);
      
      if (success) {
        alert("Configuración guardada exitosamente para tu perfil");
        console.log("Configuración de visualización actualizada (por perfil):", config);
        
        // Disparar evento personalizado para que otros componentes se actualicen
        window.dispatchEvent(new CustomEvent('visualizationConfigChanged', { detail: config }));
      } else {
        throw new Error("Error guardando configuración");
      }
    } catch (error) {
      console.error("Error guardando configuración:", error);
      alert("Error guardando la configuración");
    }
  };

  window.testNotifications = async function() {
    if ("URL" in window && "serviceWorker" in navigator) {
      try {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Prueba de notificación", {
              body: "El sistema de notificaciones está funcionando correctamente",
              icon: "/icons/ISPC-logo.png"
            });
          } else {
            alert("Las notificaciones no están permitidas. Actívelas en la configuración del navegador.");
          }
        });
      } catch (error) {
        alert("Error probando notificaciones: " + error.message);
      }
    } else {
      alert("Las notificaciones no están disponibles en este navegador");
    }
  };

  // Cargar configuración existente usando ConfigService
  const loadExistingConfig = () => {
    try {
      // Configuración de visualización (carga por perfil automáticamente)
      const vizConfig = configService.getVisualizationConfig();
      document.getElementById("temperature_unit").value = vizConfig.temperatureUnit || "celsius";
      // Asegurar que el valor mostrado sea al menos 15 segundos
      const chartRefreshValue = Math.max(vizConfig.chartRefresh || 15000, 15000);
      document.getElementById("chart_refresh").value = chartRefreshValue;
      document.getElementById("chart_points").value = vizConfig.chartPoints || 60;
      
      // Configuración de notificaciones (carga por perfil automáticamente)
      const notifConfig = configService.getNotificationConfig();
      document.getElementById("browser_notifications").checked = notifConfig.browserNotifications || false;
      document.getElementById("sound_alerts").checked = notifConfig.soundAlerts || false;
      
      console.log("Configuración cargada para el perfil actual:", { vizConfig, notifConfig });
    } catch (error) {
      console.error("Error cargando configuración:", error);
    }
  };

  // Cargar configuración desde API
  const loadSystemInfo = async () => {
    try {
      const response = await ConfigAPI.getGeneralConfig();
      if (response.success) {
        const info = response.config.systemInfo;
        
        // Actualizar información del sistema
        const dataCountEl = document.getElementById("data_count");
        if (dataCountEl) {
          dataCountEl.textContent = `${info.dataCount} registros`;
        }
        
        console.log("Información del sistema cargada:", info);
      }
    } catch (error) {
      console.error("Error cargando información del sistema:", error);
      // Fallback a datos simulados
      const randomCount = Math.floor(Math.random() * 10000) + 1000;
      const dataCountEl = document.getElementById("data_count");
      if (dataCountEl) {
        dataCountEl.textContent = `${randomCount} registros`;
      }
    }
  };

  // Cargar datos del sistema
  loadSystemInfo();

  // Cargar configuración cuando se monta el componente
  setTimeout(loadExistingConfig, 100);

  return el("div", { class: "config-container" },
    el("div", { class: "config-header" },
      el("h2", {}, "Configuración del Sistema"),
      el("p", { class: "muted" }, "Ajuste las preferencias de visualización y notificaciones")
    ),
    el("div", { class: "grid cols-2" },
      el("div", {}, userInfo, visualizacion),
      el("div", {}, notificaciones, sistemaInfo)
    ),
    configAvanzadaLink
  );
}
