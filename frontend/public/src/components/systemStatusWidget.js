// ==========================
// Componente para mostrar estado del sistema con indicadores LED
// Muestra gateways, endpoints y sensores con sus estados
// ==========================

import { el } from "../utils/dom.js";
import { GatewayAPI } from "../api.js";
import { rtClient } from "../ws.js";

export async function systemStatusWidget() {
  const root = el("div", { class: "card" },
    el("h3", {}, "Estado del Sistema"),
    el("div", { id: "system-status-content", class: "system-status-container" })
  );

  const content = root.querySelector("#system-status-content");
  
  // Mostrar loading inicial
  content.appendChild(createLoadingIndicator());

  try {
    // Cargar datos iniciales
    const statusData = await GatewayAPI.getSystemStatus();
    renderSystemStatus(content, statusData.data);
    
    // Suscribirse a actualizaciones en tiempo real
    setupRealtimeUpdates(content);
    
  } catch (error) {
    console.error("Error cargando estado del sistema:", error);
    // Si el error es 404 o similar, mostrar mensaje específico
    if (error.status === 404 || error.message?.includes('404')) {
      renderError(content, new Error("Endpoint no encontrado. Verifica que el backend esté corriendo y las rutas estén configuradas correctamente."));
    } else {
      renderError(content, error);
    }
  }

  return root;
}

function createLoadingIndicator() {
  return el("div", { class: "loading-container", style: "text-align: center; padding: 20px;" },
    el("div", { class: "loading" }),
    el("p", { style: "margin-top: 10px; color: #666;" }, "Cargando estado del sistema...")
  );
}

async function retryLoad(container) {
  container.innerHTML = "";
  container.appendChild(createLoadingIndicator());
  
  try {
    const statusData = await GatewayAPI.getSystemStatus();
    renderSystemStatus(container, statusData.data);
    setupRealtimeUpdates(container);
  } catch (error) {
    console.error("Error reintentando carga:", error);
    renderError(container, error);
  }
}

function renderError(container, error) {
  container.innerHTML = "";
  
  const errorDiv = el("div", { class: "error", style: "text-align: center; padding: 20px;" },
    el("p", { style: "color: #d32f2f; margin-bottom: 15px;" }, "Error cargando estado del sistema"),
    el("p", { style: "font-size: 0.9em; color: #666; margin-bottom: 15px;" }, error.message || "Error desconocido"),
    el("button", {
      class: "btn btn-sm",
      onclick: () => retryLoad(container)
    }, "🔄 Reintentar")
  );
  
  container.appendChild(errorDiv);
}

function renderSystemStatus(container, data) {
  const { stats, gateways, endpoints, sensors } = data || {};
  
  container.innerHTML = "";
  
  // Estadísticas generales (con valores por defecto si no existen)
  const safeStats = stats || {
    totalGateways: 0,
    onlineGateways: 0,
    totalEndpoints: 0,
    onlineEndpoints: 0,
    totalSensors: 0,
    onlineSensors: 0,
    warningSensors: 0,
    criticalSensors: 0
  };
  
  const statsSection = createStatsSection(safeStats);
  container.appendChild(statsSection);
  
  // Gateways
  if (gateways && Array.isArray(gateways) && gateways.length > 0) {
    const gatewaysSection = createGatewaysSection(gateways);
    container.appendChild(gatewaysSection);
  } else {
    // Mostrar mensaje si no hay gateways
    container.appendChild(el("div", { 
      style: "padding: 15px; background: #fff3e0; border-radius: 8px; margin-top: 15px; text-align: center; color: #666;"
    }, "No hay datos de gateways disponibles"));
  }
  
  // Endpoints
  if (endpoints && Array.isArray(endpoints) && endpoints.length > 0) {
    const endpointsSection = createEndpointsSection(endpoints);
    container.appendChild(endpointsSection);
  } else {
    // Mostrar mensaje si no hay endpoints
    container.appendChild(el("div", { 
      style: "padding: 15px; background: #fff3e0; border-radius: 8px; margin-top: 15px; text-align: center; color: #666;"
    }, "No hay datos de endpoints disponibles"));
  }
  
  // Sensores
  if (sensors && Array.isArray(sensors) && sensors.length > 0) {
    const sensorsSection = createSensorsSection(sensors);
    container.appendChild(sensorsSection);
  } else {
    // Mostrar mensaje si no hay sensores
    container.appendChild(el("div", { 
      style: "padding: 15px; background: #fff3e0; border-radius: 8px; margin-top: 15px; text-align: center; color: #666;"
    }, "No hay datos de sensores disponibles"));
  }
}

function createStatsSection(stats) {
  return el("div", { class: "stats-section" },
    el("h4", {}, "Estadísticas Generales"),
    el("div", { class: "stats-grid" },
      createStatCard("Gateways", stats.totalGateways, stats.onlineGateways, "gateway"),
      createStatCard("Endpoints", stats.totalEndpoints, stats.onlineEndpoints, "endpoint"),
      createStatCard("Sensores", stats.totalSensors, stats.onlineSensors, "sensor"),
      createStatCard("Alertas", stats.warningSensors + stats.criticalSensors, 0, "alert")
    )
  );
}

function createStatCard(title, total, online, type) {
  const percentage = total > 0 ? Math.round((online / total) * 100) : 0;
  const status = percentage === 100 ? "ok" : percentage > 50 ? "warning" : "critical";
  
  return el("div", { class: `stat-card stat-card-${status}` },
    el("div", { class: "stat-header" },
      el("h5", {}, title),
      el("div", { class: `led-indicator led-${status}` })
    ),
    el("div", { class: "stat-numbers" },
      el("span", { class: "stat-online" }, online),
      el("span", { class: "stat-separator" }, "/"),
      el("span", { class: "stat-total" }, total)
    ),
    el("div", { class: "stat-percentage" }, `${percentage}%`)
  );
}

function createGatewaysSection(gateways) {
  const section = el("div", { class: "gateways-section" },
    el("h4", {}, "Gateways"),
    el("div", { class: "gateways-grid" })
  );
  
  const grid = section.querySelector(".gateways-grid");
  
  gateways.forEach(gateway => {
    const gatewayCard = createGatewayCard(gateway);
    grid.appendChild(gatewayCard);
  });
  
  return section;
}

function createGatewayCard(gateway) {
  const status = gateway.lora_status === 'ok' ? 'ok' : 'error';
  
  return el("div", { class: `gateway-card gateway-${status}` },
    el("div", { class: "card-header" },
      el("h5", {}, `Gateway ${gateway.id}`),
      el("div", { class: `led-indicator led-${status}` })
    ),
    el("div", { class: "card-content" },
      el("p", {}, `WiFi: ${gateway.wifi_signal}`),
      el("p", {}, `LoRa: ${gateway.lora_status}`),
      el("p", {}, `Uptime: ${gateway.uptime}`)
    )
  );
}

function createEndpointsSection(endpoints) {
  const section = el("div", { class: "endpoints-section" },
    el("h4", {}, "Endpoints"),
    el("div", { class: "endpoints-grid" })
  );
  
  const grid = section.querySelector(".endpoints-grid");
  
  endpoints.forEach(endpoint => {
    const endpointCard = createEndpointCard(endpoint);
    grid.appendChild(endpointCard);
  });
  
  return section;
}

function createEndpointCard(endpoint) {
  const status = endpoint.status;
  const batteryStatus = endpoint.bateria < 20 ? 'critical' : endpoint.bateria < 50 ? 'warning' : 'ok';
  
  return el("div", { class: `endpoint-card endpoint-${status}` },
    el("div", { class: "card-header" },
      el("h5", {}, `Endpoint ${endpoint.id}`),
      el("div", { class: `led-indicator led-${status}` })
    ),
    el("div", { class: "card-content" },
      el("p", {}, `Gateway: ${endpoint.gateway_id}`),
      el("p", {}, `Batería: ${endpoint.bateria}%`),
      el("p", {}, `LoRa: ${endpoint.lora}`),
      el("p", {}, `Sensores: ${endpoint.sensores}`),
      el("div", { class: `battery-indicator battery-${batteryStatus}` },
        el("div", { class: "battery-bar", style: `width: ${endpoint.bateria}%` })
      )
    )
  );
}

function createSensorsSection(sensors) {
  const section = el("div", { class: "sensors-section" },
    el("h4", {}, "Sensores"),
    el("div", { class: "sensors-grid" })
  );
  
  const grid = section.querySelector(".sensors-grid");
  
  sensors.forEach(sensor => {
    const sensorCard = createSensorCard(sensor);
    grid.appendChild(sensorCard);
  });
  
  return section;
}

function createSensorCard(sensor) {
  const status = sensor.status;
  const alerts = sensor.alerts || [];
  
  return el("div", { class: `sensor-card sensor-${status}` },
    el("div", { class: "card-header" },
      el("h5", {}, `Sensor ${sensor.id}`),
      el("div", { class: `led-indicator led-${status}` })
    ),
    el("div", { class: "card-content" },
      el("p", {}, `Endpoint: ${sensor.endpoint_id}`),
      el("p", {}, `Posición: ${sensor.posicion}`),
      el("p", {}, `Temperatura: ${sensor.temperatura}°C`),
      el("p", {}, `Humedad: ${sensor.humedad}%`),
      el("p", {}, `Estado: ${sensor.estado}`),
      alerts.length > 0 ? createAlertsList(alerts) : null
    )
  );
}

function createAlertsList(alerts) {
  const alertsList = el("div", { class: "alerts-list" });
  
  alerts.forEach(alert => {
    const alertItem = el("div", { class: `alert-item alert-${alert.type}` },
      el("span", { class: "alert-text" }, `${alert.type}: ${alert.value} (umbral: ${alert.threshold})`)
    );
    alertsList.appendChild(alertItem);
  });
  
  return alertsList;
}

function setupRealtimeUpdates(container) {
  // Suscribirse a actualizaciones de gateway
  rtClient.subscribe("gateway_update", (data) => {
    console.log("Gateway update recibido:", data);
    // Usar data.payload o data.data (dependiendo del formato del mensaje)
    const gatewayData = data.payload || data.data;
    if (gatewayData) {
      updateGatewayInUI(container, gatewayData);
    } else {
      console.warn("Gateway update sin datos válidos:", data);
    }
  });
  
  // Suscribirse a actualizaciones de endpoint
  rtClient.subscribe("endpoint_update", (data) => {
    console.log("Endpoint update recibido:", data);
    // Usar data.payload o data.data (dependiendo del formato del mensaje)
    const endpointData = data.payload || data.data;
    if (endpointData) {
      updateEndpointInUI(container, endpointData);
    } else {
      console.warn("Endpoint update sin datos válidos:", data);
    }
  });
  
  // Suscribirse a actualizaciones de sensor
  rtClient.subscribe("sensor_update", (data) => {
    console.log("Sensor update recibido:", data);
    // Usar data.payload o data.data (dependiendo del formato del mensaje)
    const sensorData = data.payload || data.data;
    if (sensorData) {
      updateSensorInUI(container, sensorData);
    } else {
      console.warn("Sensor update sin datos válidos:", data);
    }
  });
}

function updateGatewayInUI(container, gatewayData) {
  // Validar que gatewayData existe y tiene id
  if (!gatewayData || !gatewayData.id) {
    console.warn("updateGatewayInUI: Datos de gateway inválidos", gatewayData);
    return;
  }
  
  const gatewayCard = container.querySelector(`.gateway-card[data-id="${gatewayData.id}"]`);
  if (gatewayCard) {
    // Actualizar datos del gateway
    const status = gatewayData.lora_status === 'ok' ? 'ok' : 'error';
    gatewayCard.className = `gateway-card gateway-${status}`;
    
    const ledIndicator = gatewayCard.querySelector(".led-indicator");
    ledIndicator.className = `led-indicator led-${status}`;
    
    // Actualizar contenido
    const content = gatewayCard.querySelector(".card-content");
    content.innerHTML = `
      <p>WiFi: ${gatewayData.wifi_signal}</p>
      <p>LoRa: ${gatewayData.lora_status}</p>
      <p>Uptime: ${gatewayData.uptime}</p>
    `;
  }
}

function updateEndpointInUI(container, endpointData) {
  // Validar que endpointData existe y tiene id
  if (!endpointData || !endpointData.id) {
    console.warn("updateEndpointInUI: Datos de endpoint inválidos", endpointData);
    return;
  }
  
  const endpointCard = container.querySelector(`.endpoint-card[data-id="${endpointData.id}"]`);
  if (endpointCard) {
    // Actualizar datos del endpoint
    const status = endpointData.status;
    endpointCard.className = `endpoint-card endpoint-${status}`;
    
    const ledIndicator = endpointCard.querySelector(".led-indicator");
    ledIndicator.className = `led-indicator led-${status}`;
    
    // Actualizar contenido
    const content = endpointCard.querySelector(".card-content");
    content.innerHTML = `
      <p>Gateway: ${endpointData.gateway_id}</p>
      <p>Batería: ${endpointData.bateria}%</p>
      <p>LoRa: ${endpointData.lora}</p>
      <p>Sensores: ${endpointData.sensores}</p>
    `;
  }
}

function updateSensorInUI(container, sensorData) {
  // Validar que sensorData existe y tiene id
  if (!sensorData || !sensorData.id) {
    console.warn("updateSensorInUI: Datos de sensor inválidos", sensorData);
    return;
  }
  
  const sensorCard = container.querySelector(`.sensor-card[data-id="${sensorData.id}"]`);
  if (sensorCard) {
    // Actualizar datos del sensor
    const status = sensorData.status;
    sensorCard.className = `sensor-card sensor-${status}`;
    
    const ledIndicator = sensorCard.querySelector(".led-indicator");
    ledIndicator.className = `led-indicator led-${status}`;
    
    // Actualizar contenido
    const content = sensorCard.querySelector(".card-content");
    content.innerHTML = `
      <p>Endpoint: ${sensorData.endpoint_id}</p>
      <p>Posición: ${sensorData.posicion}</p>
      <p>Temperatura: ${sensorData.temperatura}°C</p>
      <p>Humedad: ${sensorData.humedad}%</p>
      <p>Estado: ${sensorData.estado}</p>
    `;
    
    // Actualizar alertas si las hay
    const alerts = sensorData.alerts || [];
    if (alerts.length > 0) {
      const alertsList = createAlertsList(alerts);
      content.appendChild(alertsList);
    }
  }
}
