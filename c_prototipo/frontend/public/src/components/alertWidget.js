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

  function createAlertCard(alert) {
    const severityColors = {
      critical: '#dc2626',
      warning: '#f59e0b',
      info: '#0284c7'
    };
    
    const color = severityColors[alert.severity] || severityColors.warning;
    const icon = alert.severity === 'critical' ? '🔴' : '🟡';
    
    return el("div", {
      style: `
        padding: 10px;
        margin-bottom: 8px;
        border-left: 4px solid ${color};
        background: ${color}10;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
      `
    },
      el("span", {
        style: "font-size: 1.2rem;"
      }, icon),
      el("div", {
        style: "flex: 1;"
      },
        el("div", {
          style: "font-weight: 600; color: var(--color-texto); margin-bottom: 4px;"
        }, alert.message),
        el("div", {
          style: "font-size: 0.8rem; color: var(--color-texto-secundario);"
        }, new Date(alert.timestamp).toLocaleString())
      )
    );
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
