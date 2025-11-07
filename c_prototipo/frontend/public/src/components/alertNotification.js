// ==========================
// Componente de Notificaciones Push/Pop-up para Alertas
// Muestra notificaciones visuales cuando se disparan alarmas
// Compatible con PC y móvil
// ==========================

import { el } from "../utils/dom.js";
import { alertService } from "../utils/alertService.js";
import { severityColors, formatters } from "../utils/uiComponents.js";

class AlertNotificationManager {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.maxNotifications = 5; // Máximo de notificaciones visibles simultáneamente
    this.autoCloseDelay = {
      critical: 10000, // 10 segundos para críticas
      warning: 8000,  // 8 segundos para warnings
      info: 5000      // 5 segundos para info
    };
    this.initialize();
  }

  initialize() {
    // Crear contenedor de notificaciones
    this.container = el("div", {
      id: "alert-notifications-container",
      style: `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        width: calc(100% - 40px);
        pointer-events: none;
      `
    });
    document.body.appendChild(this.container);

    // Escuchar eventos de alerta
    window.addEventListener('alert', (event) => {
      this.showNotification(event.detail);
    });

    // También escuchar eventos personalizados de alertService
    if (window.alertService) {
      // Ya está configurado para disparar eventos 'alert'
    }

    // Estilos responsivos
    this.setupResponsiveStyles();
  }

  setupResponsiveStyles() {
    // Media query para móviles
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        #alert-notifications-container {
          top: 10px;
          right: 10px;
          left: 10px;
          width: calc(100% - 20px);
          max-width: none;
        }
      }
      
      @media (max-width: 480px) {
        #alert-notifications-container {
          top: 5px;
          right: 5px;
          left: 5px;
          width: calc(100% - 10px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Muestra una notificación de alarma
   */
  showNotification(alertData) {
    // Evitar duplicados recientes
    const recentAlert = this.notifications.find(n => 
      n.sensorType === alertData.sensorType && 
      n.type === alertData.type &&
      Date.now() - n.timestamp < 5000 // 5 segundos
    );
    
    if (recentAlert) {
      return; // Ya existe una notificación similar reciente
    }

    // Crear notificación
    const notification = this.createNotificationElement(alertData);
    
    // Agregar al contenedor
    this.container.appendChild(notification);
    this.notifications.push({
      element: notification,
      sensorType: alertData.sensorType,
      type: alertData.type,
      timestamp: Date.now()
    });

    // Limitar número de notificaciones
    if (this.notifications.length > this.maxNotifications) {
      const oldest = this.notifications.shift();
      this.removeNotification(oldest.element);
    }

    // Auto-cerrar después de un delay
    const delay = this.autoCloseDelay[alertData.severity] || this.autoCloseDelay.warning;
    setTimeout(() => {
      this.removeNotification(notification);
    }, delay);

    // Animación de entrada
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });
  }

  /**
   * Crea el elemento de notificación
   */
  createNotificationElement(alertData) {
    const severity = alertData.severity || 'warning';
    const colors = severityColors[severity] || severityColors.warning;

    // Información del sensor/dispositivo
    const sensorInfo = this.getSensorInfo(alertData);
    
    // Formatear valor según tipo usando formatters centralizados
    const formattedValue = this.formatValue(alertData.value, alertData.sensorType);
    const formattedThreshold = alertData.threshold !== undefined && alertData.threshold !== null 
      ? this.formatValue(alertData.threshold, alertData.sensorType) 
      : null;

    const notification = el("div", {
      class: "alert-notification",
      style: `
        background: ${colors.bg};
        border-left: 4px solid ${colors.border};
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
        position: relative;
        animation: slideInRight 0.3s ease forwards;
      `
    },
      // Botón de cerrar
      el("button", {
        class: "alert-notification-close",
        style: `
          position: absolute;
          top: 8px;
          right: 8px;
          background: transparent;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: ${colors.text};
          padding: 4px;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        `,
        onclick: () => this.removeNotification(notification),
        onmouseover: (e) => e.target.style.opacity = '1',
        onmouseout: (e) => e.target.style.opacity = '0.7'
      }, "×"),
      
      // Contenedor principal
      el("div", {
        style: "display: flex; gap: 12px; align-items: flex-start;"
      },
        // Icono de severidad
        el("div", {
          style: `
            font-size: 2rem;
            line-height: 1;
            flex-shrink: 0;
          `
        }, colors.icon),
        
        // Contenido
        el("div", {
          style: "flex: 1; min-width: 0;"
        },
          // Título con severidad
          el("div", {
            style: `
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
            `
          },
            el("span", {
              style: `
                font-weight: 700;
                font-size: 0.875rem;
                text-transform: uppercase;
                color: ${colors.border};
                letter-spacing: 0.5px;
              `
            }, severity === 'critical' ? 'CRÍTICO' : severity === 'warning' ? 'ADVERTENCIA' : 'INFO'),
            el("span", {
              style: `
                font-size: 0.75rem;
                color: ${colors.text};
                opacity: 0.7;
              `
            }, this.getSensorTypeLabel(alertData.sensorType))
          ),
          
          // Mensaje principal
          el("div", {
            style: `
              font-weight: 600;
              color: ${colors.text};
              margin-bottom: 8px;
              font-size: 0.95rem;
              line-height: 1.4;
            `
          }, alertData.message),
          
          // Información del sensor/dispositivo
          ...(sensorInfo.deviceId || sensorInfo.deviceType ? [el("div", {
            style: `
              font-size: 0.8rem;
              color: ${colors.text};
              opacity: 0.8;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 4px;
              flex-wrap: wrap;
            `
          },
            ...(sensorInfo.deviceType ? [el("span", {}, sensorInfo.deviceType)] : []),
            ...(sensorInfo.deviceId ? [el("span", {}, `ID: ${sensorInfo.deviceId}`)] : [])
          )] : []),
          
          ...(sensorInfo.sensorId ? [el("div", {
            style: `
              font-size: 0.8rem;
              color: ${colors.text};
              opacity: 0.8;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 4px;
            `
          },
            el("span", { style: "font-weight: 600;" }, "Sensor:"),
            el("span", {}, sensorInfo.sensorId)
          )] : []),
          
          ...(sensorInfo.endpointId && sensorInfo.endpointId !== sensorInfo.deviceId ? [el("div", {
            style: `
              font-size: 0.8rem;
              color: ${colors.text};
              opacity: 0.8;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 4px;
            `
          },
            el("span", { style: "font-weight: 600;" }, "Endpoint:"),
            el("span", {}, sensorInfo.endpointId)
          )] : []),
          
          // Valores
          el("div", {
            style: `
              display: flex;
              gap: 12px;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid ${colors.border}40;
              flex-wrap: wrap;
            `
          },
            el("div", {
              style: `
                font-size: 0.85rem;
                color: ${colors.text};
              `
            },
              el("span", { style: "font-weight: 600;" }, "Valor actual: "),
              el("span", { style: "font-weight: 700; font-size: 1rem;" }, formattedValue)
            ),
            ...(formattedThreshold ? [el("div", {
              style: `
                font-size: 0.85rem;
                color: ${colors.text};
              `
            },
              el("span", { style: "font-weight: 600;" }, "Umbral: "),
              el("span", {}, formattedThreshold)
            )] : [])
          ),
          
          // Timestamp usando formatters centralizados
          el("div", {
            style: `
              font-size: 0.7rem;
              color: ${colors.text};
              opacity: 0.6;
              margin-top: 8px;
            `
          }, formatters.dateTime(new Date(), 'time'))
        )
      )
    );

    // Agregar animación CSS
    if (!document.getElementById('alert-notification-animations')) {
      const animationStyle = document.createElement('style');
      animationStyle.id = 'alert-notification-animations';
      animationStyle.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
        
        @media (max-width: 768px) {
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOutRight {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }
        }
      `;
      document.head.appendChild(animationStyle);
    }

    return notification;
  }

  /**
   * Obtiene información del sensor/dispositivo del alertData
   */
  getSensorInfo(alertData) {
    const sensorId = alertData.sensorId || alertData.sensor_id || alertData.id || null;
    const deviceId = alertData.deviceId || alertData.device_id || alertData.gateway_id || null;
    const deviceType = alertData.deviceType || alertData.device_type || null;
    const endpointId = alertData.endpointId || alertData.endpoint_id || null;
    
    // Formatear tipo de dispositivo para mostrar
    let deviceTypeLabel = null;
    if (deviceType) {
      const typeLabels = {
        sensor: '🌡️ Sensor',
        endpoint: '🔌 Endpoint',
        gateway: '📡 Gateway'
      };
      deviceTypeLabel = typeLabels[deviceType] || deviceType;
    }
    
    // Si hay endpointId pero no deviceId, usar endpointId como deviceId
    const displayDeviceId = deviceId || endpointId || 'N/A';
    
    return {
      sensorId,
      deviceId: displayDeviceId !== 'N/A' ? displayDeviceId : null,
      deviceType: deviceTypeLabel,
      endpointId,
      rawDeviceType: deviceType
    };
  }

  /**
   * Obtiene etiqueta legible del tipo de sensor
   */
  getSensorTypeLabel(sensorType) {
    const labels = {
      temperature: '🌡️ Temperatura',
      humidity: '💧 Humedad',
      co2: '💨 CO₂',
      battery: '🔋 Batería'
    };
    return labels[sensorType] || sensorType;
  }

  /**
   * Formatea el valor según el tipo de sensor usando formatters centralizados
   */
  formatValue(value, sensorType) {
    if (value === null || value === undefined) return 'N/A';
    
    switch (sensorType) {
      case 'temperature':
        return formatters.temperature(value);
      case 'humidity':
        return formatters.humidity(value);
      case 'co2':
        return formatters.co2(value);
      case 'battery':
        return formatters.battery(value);
      default:
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return String(value);
        return numValue.toFixed(2);
    }
  }

  /**
   * Remueve una notificación
   */
  removeNotification(element) {
    if (!element || !element.parentNode) return;

    // Animación de salida
    element.style.animation = 'slideOutRight 0.3s ease forwards';
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      // Remover de la lista
      this.notifications = this.notifications.filter(n => n.element !== element);
    }, 300);
  }

  /**
   * Limpia todas las notificaciones
   */
  clearAll() {
    this.notifications.forEach(n => this.removeNotification(n.element));
    this.notifications = [];
  }
}

// Instancia singleton
export const alertNotificationManager = new AlertNotificationManager();

// Inicializar cuando el DOM esté listo
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      alertNotificationManager.initialize();
    });
  } else {
    alertNotificationManager.initialize();
  }
}

