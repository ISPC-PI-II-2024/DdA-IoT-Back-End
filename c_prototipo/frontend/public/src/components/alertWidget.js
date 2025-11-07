// ==========================
// Widget de Alertas Activas
// Muestra las alertas activas en el sistema
// ==========================

import { el } from "../utils/dom.js";
import { alertService } from "../utils/alertService.js";

export function alertWidget() {
  const container = el("div", {
    id: "alert-widget-container",
    class: "card",
    style: "margin-bottom: 20px;"
  });

  // Crear referencia al contador de alertas
  const alertCountSpan = el("span", {
    id: "alert-count",
    style: "background: var(--color-error); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;"
  }, "0");

  const title = el("h3", {
    style: "margin-bottom: 15px; display: flex; align-items: center; gap: 10px;"
  },
    el("span", {}, "🚨 Alertas Activas"),
    alertCountSpan
  );

  const alertsList = el("div", {
    id: "alerts-list",
    style: "max-height: 300px; overflow-y: auto;"
  });

  const noAlerts = el("div", {
    id: "no-alerts",
    style: "text-align: center; padding: 20px; color: var(--color-texto-secundario);"
  }, "No hay alertas activas");

  container.appendChild(title);
  container.appendChild(alertsList);
  
  // Función para renderizar alertas
  function renderAlerts() {
    const alerts = alertService.getActiveAlerts();
    alertsList.innerHTML = "";
    
    if (alerts.length === 0) {
      alertsList.appendChild(noAlerts);
      alertCountSpan.textContent = "0";
      return;
    }
    
    alertCountSpan.textContent = alerts.length;
    
    // Agrupar por tipo
    const alertsByType = {};
    alerts.forEach(alert => {
      if (!alertsByType[alert.sensorType]) {
        alertsByType[alert.sensorType] = [];
      }
      alertsByType[alert.sensorType].push(alert);
    });
    
    // Renderizar por tipo
    Object.entries(alertsByType).forEach(([type, typeAlerts]) => {
      const typeSection = el("div", {
        style: "margin-bottom: 15px;"
      },
        el("h4", {
          style: "font-size: 0.9rem; color: var(--color-texto-secundario); margin-bottom: 10px; text-transform: uppercase;"
        }, type)
      );
      
      typeAlerts.forEach(alert => {
        const alertCard = createAlertCard(alert);
        typeSection.appendChild(alertCard);
      });
      
      alertsList.appendChild(typeSection);
    });
  }

// ==========================
// Widget de Alertas Activas
// Muestra las alertas activas en el sistema
// ==========================

import { el } from "../utils/dom.js";
import { alertService } from "../utils/alertService.js";
import { createAlertCard, severityColors } from "../utils/uiComponents.js";

export function alertWidget() {
  const container = el("div", {
    id: "alert-widget-container",
    class: "card",
    style: "margin-bottom: 20px;"
  });

  // Crear referencia al contador de alertas
  const alertCountSpan = el("span", {
    id: "alert-count",
    style: "background: var(--color-error); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;"
  }, "0");

  const title = el("h3", {
    style: "margin-bottom: 15px; display: flex; align-items: center; gap: 10px;"
  },
    el("span", {}, "🚨 Alertas Activas"),
    alertCountSpan
  );

  const alertsList = el("div", {
    id: "alerts-list",
    style: "max-height: 300px; overflow-y: auto;"
  });

  const noAlerts = el("div", {
    id: "no-alerts",
    style: "text-align: center; padding: 20px; color: var(--color-texto-secundario);"
  }, "No hay alertas activas");

  container.appendChild(title);
  container.appendChild(alertsList);
  
  // Función para renderizar alertas
  function renderAlerts() {
    const alerts = alertService.getActiveAlerts();
    alertsList.innerHTML = "";
    
    if (alerts.length === 0) {
      alertsList.appendChild(noAlerts);
      alertCountSpan.textContent = "0";
      return;
    }
    
    alertCountSpan.textContent = alerts.length;
    
    // Agrupar por tipo
    const alertsByType = {};
    alerts.forEach(alert => {
      if (!alertsByType[alert.sensorType]) {
        alertsByType[alert.sensorType] = [];
      }
      alertsByType[alert.sensorType].push(alert);
    });
    
    // Renderizar por tipo usando el componente reutilizable
    Object.entries(alertsByType).forEach(([type, typeAlerts]) => {
      const typeSection = el("div", {
        style: "margin-bottom: 15px;"
      },
        el("h4", {
          style: "font-size: 0.9rem; color: var(--color-texto-secundario); margin-bottom: 10px; text-transform: uppercase;"
        }, type)
      );
      
      typeAlerts.forEach(alert => {
        const alertCard = createAlertCard(alert, {
          showSeverity: true,
          showTimestamp: true,
          showDeviceInfo: false, // Ya se muestra en alertNotification
          compact: false
        });
        typeSection.appendChild(alertCard);
      });
      
      alertsList.appendChild(typeSection);
    });
  }

  // Función para actualizar alertas automáticamente
  function updateAlerts() {
    alertService.clearOldAlerts();
    renderAlerts();
  }

  // Renderizar inicialmente
  updateAlerts();
  
  // Actualizar cada 5 segundos
  const updateInterval = setInterval(updateAlerts, 5000);
  
  // Limpiar intervalo cuando se desmonta el componente
  container.addEventListener('unmount', () => {
    clearInterval(updateInterval);
  });
  
  // Escuchar eventos de alerta
  window.addEventListener('alert', updateAlerts);
  
  return container;
}
