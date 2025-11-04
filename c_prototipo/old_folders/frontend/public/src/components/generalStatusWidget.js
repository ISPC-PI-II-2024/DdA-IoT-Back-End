// ==========================
// Widget de Estado General con indicadores LED por dispositivo
// Muestra datos de gateway/gateway y gateway/endpoint topics
// ==========================
import { el } from "../utils/dom.js";
import { getState, setDevices } from "../state/store.js";
import { GatewayAPI } from "../api.js";

export async function generalStatusWidget() {
  
  // Función para obtener estado del gateway y endpoints
  async function getSystemStatus() {
    try {
      const response = await GatewayAPI.getSystemStatus();
      if (response && response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo estado del sistema:', error);
      return null;
    }
  }

  // Crear el contenedor principal
  const container = el("div", {
    class: "card",
    style: "margin-bottom: 20px;"
  });

  // Título del widget
  const title = el("h3", {
    style: "margin-bottom: 15px; display: flex; align-items: center; gap: 10px;"
  }, 
    el("span", {}, "Estado General de Dispositivos"),
    el("span", {
      id: "refresh-status-btn",
      style: "font-size: 0.8em; color: #666; cursor: pointer; padding: 5px 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;",
      title: "Actualizar estado"
    }, "🔄 Actualizar")
  );

  // Contenedor de dispositivos
  const devicesContainer = el("div", {
    id: "devices-status-container",
    style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;"
  });

  // Función para actualizar el estado de gateway y endpoints
  async function updateDevicesStatus() {
    devicesContainer.innerHTML = "";
    
    // Mostrar indicador de carga
    const loadingDiv = el("div", {
      style: "text-align: center; padding: 20px; color: #666; grid-column: 1 / -1;"
    }, "Cargando estado del sistema...");
    devicesContainer.appendChild(loadingDiv);

    try {
      const systemData = await getSystemStatus();
      
      if (!systemData) {
        devicesContainer.innerHTML = "";
        devicesContainer.appendChild(el("div", {
          style: "text-align: center; padding: 20px; color: #d32f2f; grid-column: 1 / -1;"
        }, "Error obteniendo estado del sistema"));
        return;
      }

      // Limpiar indicador de carga
      devicesContainer.innerHTML = "";

      const { gateways, endpoints } = systemData;

      // Mostrar gateways desde gateway/gateway topic
      if (gateways && gateways.length > 0) {
        gateways.forEach(gateway => {
          const statusColor = gateway.lora_status === 'ok' ? '#4CAF50' : '#d32f2f';
          
          const gatewayCard = el("div", {
            style: `
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `
          });

          const ledIndicator = el("div", {
            style: `
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: ${statusColor};
              box-shadow: 0 0 8px ${statusColor}40;
              margin-right: 10px;
            `
          });

          const gatewayInfo = el("div", { style: "flex: 1;" },
            el("div", { style: "font-weight: bold; margin-bottom: 5px;" }, `Gateway ${gateway.id}`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `LoRa: ${gateway.lora_status}`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `WiFi: ${gateway.wifi_signal}`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `Uptime: ${gateway.uptime}`)
          );

          gatewayCard.appendChild(el("div", { style: "display: flex; align-items: flex-start;" }, ledIndicator, gatewayInfo));
          devicesContainer.appendChild(gatewayCard);
        });
      }

      // Mostrar endpoints desde gateway/endpoint topic
      if (endpoints && endpoints.length > 0) {
        endpoints.forEach(endpoint => {
          const statusColor = endpoint.status === 'ok' ? '#4CAF50' : 
                              endpoint.status === 'battery_low' ? '#FF9800' : '#d32f2f';
          
          const endpointCard = el("div", {
            style: `
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `
          });

          const ledIndicator = el("div", {
            style: `
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: ${statusColor};
              box-shadow: 0 0 8px ${statusColor}40;
              margin-right: 10px;
            `
          });

          const endpointInfo = el("div", { style: "flex: 1;" },
            el("div", { style: "font-weight: bold; margin-bottom: 5px;" }, `Endpoint ${endpoint.id}`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `Batería: ${endpoint.bateria}%`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `Cargando: ${endpoint.cargando ? 'Sí' : 'No'}`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `LoRa: ${endpoint.lora}`),
            el("div", { style: "font-size: 0.9em; color: #666;" }, `Sensores: ${endpoint.sensores}`)
          );

          endpointCard.appendChild(el("div", { style: "display: flex; align-items: flex-start;" }, ledIndicator, endpointInfo));
          devicesContainer.appendChild(endpointCard);
        });
      }

      if ((!gateways || gateways.length === 0) && (!endpoints || endpoints.length === 0)) {
        devicesContainer.appendChild(el("div", {
          style: "text-align: center; padding: 20px; color: #666; grid-column: 1 / -1;"
        }, 
          el("div", { style: "font-size: 2em; margin-bottom: 10px;" }, "📡"),
          el("p", { style: "margin-bottom: 10px;" }, "No hay datos de gateway o endpoints disponibles"),
          el("p", { style: "font-size: 0.85em; color: #888;" }, "Los datos aparecerán cuando los dispositivos envíen información por MQTT")
        ));
      }

    } catch (error) {
      console.error('Error actualizando estado:', error);
      devicesContainer.innerHTML = "";
      
      let errorMessage = "Error verificando estado del sistema";
      if (error.status === 404 || error.message?.includes('404')) {
        errorMessage = "Endpoint no encontrado. Verifica que el backend esté corriendo.";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      devicesContainer.appendChild(el("div", {
        style: "text-align: center; padding: 20px; color: #d32f2f; grid-column: 1 / -1;"
      },
        el("div", { style: "font-size: 2em; margin-bottom: 10px;" }, "❌"),
        el("p", { style: "margin-bottom: 10px;" }, errorMessage),
        el("button", {
          class: "btn btn-sm",
          style: "margin-top: 10px;",
          onclick: updateDevicesStatus
        }, "🔄 Reintentar")
      ));
    }
  }

  // Event listener para el botón de actualizar
  title.querySelector('#refresh-status-btn').addEventListener('click', updateDevicesStatus);

  // Construir el widget
  container.appendChild(title);
  container.appendChild(devicesContainer);

  // Actualizar estado inicial
  await updateDevicesStatus();

  // Actualizar automáticamente cada 30 segundos (ajustado para sincronizar con lecturas)
  // Usar un delay inicial para evitar conflictos con otros widgets
  let isUpdating = false;
  const autoRefreshInterval = setInterval(async () => {
    if (!isUpdating) {
      isUpdating = true;
      try {
        await updateDevicesStatus();
      } finally {
        isUpdating = false;
      }
    }
  }, 30000);

  // Limpiar intervalo cuando se destruya el componente
  container.addEventListener('destroy', () => {
    clearInterval(autoRefreshInterval);
  });

  return container;
}

// Agregar estilos CSS para la animación de pulso
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;
document.head.appendChild(style);
