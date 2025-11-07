// ==========================
// Componente para las cards de visualización de dispositivos
// Maneja gráficos y visualización de datos de dispositivos seleccionados
// ==========================

import { el } from "../utils/dom.js";
import { chartWidget } from "./chartWidget.js";
import { temperatureChartWidget } from "./temperatureChart.js";
import { GatewayAPI } from "../api.js";
import { configService } from "../utils/configService.js";
import * as uiComponents from "../utils/uiComponents.js";

let currentTemperatureChart = null;
let currentSelectedDevice = null;

export async function updateTemperatureChart(device) {
  currentSelectedDevice = device;
  
  if (currentTemperatureChart && currentTemperatureChart.parentNode) {
    currentTemperatureChart.parentNode.removeChild(currentTemperatureChart);
    currentTemperatureChart = null;
  }

  if (!device || (device.tipo !== 'sensor' && device.tipo !== 'endpoint')) {
    return null;
  }

  let endpointSensorIds = [];
  if (device.tipo === 'endpoint') {
    try {
      const endpointData = await GatewayAPI.getEndpointById(device.id_dispositivo);
      if (endpointData && endpointData.success && endpointData.data.sensors) {
        endpointSensorIds = endpointData.data.sensors.map(s => s.id);
      }
    } catch (error) {
      console.warn('No se pudieron obtener sensores del endpoint:', error);
    }
  }

  const config = configService.getVisualizationConfig();
  const maxPoints = config.chartPoints || 60;

  let chartTitle;
  if (device.tipo === 'sensor') {
    chartTitle = `Temperatura - Sensor ${device.id_dispositivo}`;
  } else {
    chartTitle = `Temperatura - Endpoint ${device.id_dispositivo} (${endpointSensorIds.length} sensores)`;
  }
  
  currentTemperatureChart = await temperatureChartWidget({ 
    title: chartTitle,
    maxPoints: maxPoints,
    showStats: true,
    deviceId: device.id_dispositivo,
    deviceType: device.tipo,
    endpointSensorIds: endpointSensorIds
  });

  return currentTemperatureChart;
}

export async function rebuildDeviceSpecificCards(device, role) {
  if (!device || (device.tipo !== 'sensor' && device.tipo !== 'endpoint')) {
    return el("div", { class: "card" },
      el("div", {
        style: "text-align: center; padding: 40px; color: #666;"
      },
        el("h3", { style: "margin-bottom: 15px;" }, "Selecciona un Endpoint o Sensor"),
        el("p", { style: "margin-bottom: 20px;" }, 
          "Usa el selector de arriba para elegir un Endpoint o Sensor y ver sus lecturas en tiempo real."
        ),
        el("div", { style: "font-size: 0.9em; color: #888; margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;" },
          el("p", { style: "font-weight: 600; margin-bottom: 10px;" }, "📋 Información:"),
          el("ul", { style: "text-align: left; margin-top: 10px; list-style: none; padding: 0;" },
            el("li", { style: "margin-bottom: 8px;" }, "🔌 Endpoint: Muestra lecturas de todos los sensores asociados"),
            el("li", { style: "margin-bottom: 8px;" }, "🌡️ Sensor: Muestra solo las lecturas de ese sensor específico"),
            el("li", { style: "margin-bottom: 8px;" }, "📊 Gráficos de series temporales en tiempo real"),
            el("li", {}, "📈 Estadísticas y datos históricos")
          )
        )
      )
    );
  }

  let temperatureChart = null;
  try {
    temperatureChart = await updateTemperatureChart(device);
  } catch (error) {
    console.error('[DeviceVisualization] Error creando gráfico de temperatura:', error);
  }

  const rtChartTitle = `Métrica RT - ${device.nombre}`;
  const rtChart = await chartWidget({ 
    title: rtChartTitle, 
    topic: "metrics/demo" 
  });

  const grids = el("div", { class: "grid cols-2 grid-lg" },
    el("div", { class: "card card-compact" },
      el("h3", { class: "text-xl font-semibold mb-3" }, "Estado del Dispositivo"),
      el("ul", { class: "space-y-2" },
        el("li", { class: "flex justify-between" }, 
          el("span", { class: "font-medium" }, "Dispositivo:"), 
          el("span", {}, device.nombre)
        ),
        el("li", { class: "flex justify-between" }, 
          el("span", { class: "font-medium" }, "Tipo:"), 
          el("span", {}, (() => {
            return device.tipo === 'sensor' ? '🌡️ Sensor' : '🔌 Endpoint';
          })())
        ),
        el("li", { class: "flex justify-between" }, 
          el("span", { class: "font-medium" }, "Estado:"), 
          uiComponents.createStatusIndicator({
            status: device.estado || 'offline',
            showLED: true,
            showText: true
          })
        ),
        el("li", { class: "flex justify-between" }, 
          el("span", { class: "font-medium" }, "Última conexión:"), 
          el("span", { class: "text-sm" }, device.ultima_conexion ? uiComponents.formatters.dateTime(device.ultima_conexion, 'short') : 'N/A')
        )
      )
    ),
    rtChart
  );

  const actionsText = `Acciones específicas para ${device.nombre} (solo admin/action).`;
  const actions = el("div", { class: "card" },
    el("h3", {}, "Acciones del Dispositivo"),
    el("p", { class: "muted" }, actionsText),
    el("div", {},
      role === "readonly"
        ? el("div", { class: "muted" }, "Solo lectura: no hay acciones disponibles.")
        : el("div", { style: "display: flex; gap: 10px;" },
            el("button", { class: "btn" }, "Ver Histórico"),
            el("button", { class: "btn" }, "Exportar Datos")
          )
    )
  );

  const chartElement = temperatureChart || el("div", { 
    class: "card",
    style: "text-align: center; padding: 40px; color: #666;"
  }, "⏳ Cargando gráfico...");
  
  const deviceSpecificCards = el("div", {
    style: "display: flex; flex-direction: column; gap: var(--espaciado-lg); width: 100%;"
  },
    chartElement,
    grids,
    actions
  );
  
  return deviceSpecificCards;
}

export function getCurrentSelectedDevice() {
  return currentSelectedDevice;
}

