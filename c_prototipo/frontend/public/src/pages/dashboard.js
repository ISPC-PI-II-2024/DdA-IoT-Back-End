// ==========================
// Dashboard Principal - Versión Refactorizada
// Orquesta los componentes del dashboard de forma mínima y funcional
// ==========================

import { el } from "../utils/dom.js";
import { getState } from "../state/store.js";
import { generalStatusWidget } from "../components/generalStatusWidget.js";
import { systemStatusWidget } from "../components/systemStatusWidget.js";
import { mqttLogsWidget } from "../components/mqttLogsWidget.js";
import { alertWidget } from "../components/alertWidget.js";
import { deviceSelectorWidget } from "../components/deviceSelector.js";
import { createHierarchyWidget } from "../components/hierarchyWidget.js";
import * as dashboardNavModule from "../components/dashboardNav.js";
import * as deviceDataModule from "../components/deviceDataWidget.js";
import * as deviceVisualizationModule from "../components/deviceVisualizationCards.js";
import { configService } from "../utils/configService.js";
import { alertService } from "../utils/alertService.js";
import { rtClient } from "../ws.js";

export async function render() {
  try {
    const state = getState();
    const role = state.role;
    const currentProject = state.currentProject;
    const selectedDevice = state.selectedDevice;

    // Asegurar conexión WS
    if (!rtClient.ws) {
      try { 
        await rtClient.connect(); 
      } catch (e) { 
        console.error("WS connect:", e); 
      }
    }
    
    // Exponer alertService globalmente para el WebSocket
    window.alertService = alertService;
    
    // Solicitar permiso para notificaciones
    try {
      alertService.requestNotificationPermission();
    } catch (e) {
      console.warn("Error solicitando permiso de notificaciones:", e);
    }

    // Crear navegación
    const dashboardNav = dashboardNavModule.createDashboardNav();

    // Header
    const projectName = currentProject || "—";
    const header = el("div", { 
      id: "dashboard-header",
      class: "dashboard-section dashboard-header card card-feature" 
    },
      el("h2", { class: "text-2xl font-bold mb-2" }, "Panel de dispositivos IoT"),
      el("p", { class: "muted text-lg" }, `Proyecto actual: ${projectName}`)
    );

    // Widgets principales
    let generalStatus = null;
    try {
      generalStatus = await generalStatusWidget();
      if (generalStatus) {
        generalStatus.id = "dashboard-general-status";
        generalStatus.classList.add("dashboard-section", "dashboard-general-status");
      }
    } catch (error) {
      console.error('[Dashboard] Error cargando generalStatusWidget:', error);
    }

    let systemStatus = null;
    try {
      systemStatus = await systemStatusWidget();
      if (systemStatus) {
        systemStatus.id = "dashboard-system-status";
        systemStatus.classList.add("dashboard-section", "dashboard-system-status");
      }
    } catch (error) {
      console.error('[Dashboard] Error cargando systemStatusWidget:', error);
    }

    const hierarchyWidget = createHierarchyWidget();
    hierarchyWidget.id = "dashboard-hierarchy";
    hierarchyWidget.classList.add("dashboard-section", "dashboard-hierarchy");

    const mqttLogs = mqttLogsWidget();
    if (mqttLogs) {
      mqttLogs.id = "dashboard-mqtt-logs";
      mqttLogs.classList.add("dashboard-section", "dashboard-mqtt-logs");
    }

    const alertsWidget = alertWidget();
    if (alertsWidget) {
      alertsWidget.id = "dashboard-alerts";
      alertsWidget.classList.add("dashboard-section", "dashboard-alerts");
    }

    // Selector de dispositivos
    let deviceSelector = null;
    try {
      deviceSelector = await deviceSelectorWidget();
      if (deviceSelector) {
        deviceSelector.id = "dashboard-device-selector";
        deviceSelector.classList.add("dashboard-section", "dashboard-device-selector");
      }
    } catch (error) {
      console.error('[Dashboard] Error cargando deviceSelectorWidget:', error);
    }

    // Contenedores para datos de dispositivos
    const deviceDataContainer = deviceDataModule.createDeviceDataWidget();
    const deviceCardsContainer = el("div", {
      id: "device-cards-container",
      "data-device-cards-container": true,
      class: "dashboard-section dashboard-device-cards",
      style: "display: none;"
    });

    // Suscripción a cambios en la configuración de visualización
    let configUnsubscribe = null;
    try {
      configUnsubscribe = configService.onConfigChange('visualization_config', async (newConfig) => {
        console.log('[Dashboard] Configuración de visualización actualizada:', newConfig);
        const currentDevice = selectedDevice;
        if (currentDevice && (currentDevice.tipo === 'sensor' || currentDevice.tipo === 'endpoint')) {
          const newCards = await deviceVisualizationModule.rebuildDeviceSpecificCards(currentDevice, role);
          const container = document.querySelector('[data-device-cards-container]');
          if (container && newCards) {
            container.innerHTML = '';
            container.appendChild(newCards);
          }
        }
      });
    } catch (error) {
      console.warn('[Dashboard] Error suscribiéndose a cambios de configuración:', error);
    }

    // Si ya hay un dispositivo seleccionado, cargar sus datos
    if (selectedDevice && (selectedDevice.tipo === 'sensor' || selectedDevice.tipo === 'endpoint')) {
      try {
        deviceDataContainer.style.display = "block";
        deviceCardsContainer.style.display = "block";
        await deviceDataModule.loadDeviceData(selectedDevice, deviceDataContainer);
        const cards = await rebuildDeviceSpecificCards(selectedDevice, role);
        if (cards) {
          deviceCardsContainer.appendChild(cards);
        }
      } catch (error) {
        console.error('[Dashboard] Error construyendo cards iniciales:', error);
      }
    }

    // Event listener para cuando se selecciona un dispositivo
    if (deviceSelector) {
      deviceSelector.addEventListener('deviceSelected', async (e) => {
        const device = e.detail.device;
        
        deviceDataContainer.style.display = "block";
        deviceCardsContainer.style.display = "block";
        
        deviceDataContainer.innerHTML = "";
        deviceDataContainer.appendChild(el("div", {
          style: "text-align: center; padding: 20px; color: #666;"
        }, "Cargando datos del dispositivo..."));
        
        deviceCardsContainer.innerHTML = "";
        deviceCardsContainer.appendChild(el("div", {
          style: "text-align: center; padding: 20px; color: #666;"
        }, "Cargando gráfico..."));
        
        try {
          await deviceDataModule.loadDeviceData(device, deviceDataContainer);
          const cards = await rebuildDeviceSpecificCards(device, role);
          if (cards) {
            deviceCardsContainer.innerHTML = '';
            deviceCardsContainer.appendChild(cards);
          }
        } catch (error) {
          console.error('[Dashboard] Error cargando dispositivo:', error);
        }
      });
    }

    // Limpieza cuando se navega fuera
    const beforeUnloadHandler = () => {
      if (configUnsubscribe) {
        configUnsubscribe();
      }
    };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Construir contenedor principal
    const dashboardContainer = el("div", { class: "dashboard-container" });
    
    const dashboardContainerChildren = [
      header,
      generalStatus,
      systemStatus,
      alertsWidget,
      deviceSelector,
      deviceDataContainer,
      deviceCardsContainer,
      hierarchyWidget,
      mqttLogs
    ];

    dashboardContainerChildren.forEach(child => {
      if (child) dashboardContainer.appendChild(child);
    });

    const pageContainer = el("div", {});
    pageContainer.appendChild(dashboardNav);
    pageContainer.appendChild(dashboardContainer);
    
    const cleanupDashboard = () => {
      if (configUnsubscribe) {
        configUnsubscribe();
      }
      dashboardNavModule.cleanupDashboardNav();
      if (beforeUnloadHandler) {
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      }
    };
    
    pageContainer.cleanup = cleanupDashboard;
    
    return pageContainer;
  } catch (error) {
    console.error('[Dashboard] Error crítico en render():', error);
    console.error('[Dashboard] Stack trace:', error.stack);
    
    const errorContainer = el("div", { class: "container" },
      el("div", { class: "card", style: "text-align: center; padding: 40px; margin-top: 40px;" },
        el("div", { style: "font-size: 4em; margin-bottom: 20px;" }, "❌"),
        el("h1", { style: "margin-bottom: 15px; color: #d32f2f;" }, "Error al cargar el Dashboard"),
        el("p", { style: "margin-bottom: 20px; color: #666;" }, 
          error.message || "Ha ocurrido un error inesperado al cargar el dashboard."
        ),
        el("div", { style: "margin-top: 30px;" },
          el("button", {
            class: "btn btn-primary",
            onclick: () => {
              window.location.reload();
            }
          }, "🔄 Recargar Página"),
          el("button", {
            class: "btn btn-secondary",
            style: "margin-left: 10px;",
            onclick: () => {
              window.location.hash = "#/home";
            }
          }, "🏠 Ir a Home")
        )
      )
    );
    
    return errorContainer;
  }
}
