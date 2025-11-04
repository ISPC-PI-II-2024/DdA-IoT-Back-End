import { el } from "../utils/dom.js";
import { getState, subscribe } from "../state/store.js";
import { chartWidget } from "../components/chartWidget.js";
import { temperatureChartWidget } from "../components/temperatureChart.js";
import { deviceSelectorWidget, selectedDeviceInfoWidget } from "../components/deviceSelector.js";
import { generalStatusWidget } from "../components/generalStatusWidget.js";
import { deviceVisualizationWidget } from "../components/deviceVisualization.js";
import { systemStatusWidget } from "../components/systemStatusWidget.js";
import { mqttLogsWidget } from "../components/mqttLogsWidget.js";
import { alertWidget } from "../components/alertWidget.js";
import { deviceService } from "../utils/deviceService.js";
import { GatewayAPI, DevicesAPI } from "../api.js";
import { alertService } from "../utils/alertService.js";
import { configService } from "../utils/configService.js";
import { rtClient } from "../ws.js";

export async function render() {
  const { role, currentProject, selectedDevice } = getState();

  // Asegurar conexión WS (si aún no conectó)
  if (!rtClient.ws) {
    try { await rtClient.connect(); } catch (e) { console.error("WS connect:", e); }
  }
  
  // Exponer alertService globalmente para el WebSocket
  window.alertService = alertService;
  
  // Solicitar permiso para notificaciones
  alertService.requestNotificationPermission();

  // Crear menú de navegación con botón hamburguesa
  const dashboardNav = el("nav", { class: "dashboard-nav-menu" },
    el("button", { 
      class: "dashboard-nav-toggle",
      id: "dashboard-nav-toggle",
      "aria-label": "Abrir menú de navegación",
      onclick: () => {
        const menu = dashboardNav;
        const overlay = document.getElementById('dashboard-nav-overlay');
        if (menu && overlay) {
          menu.classList.toggle('mobile-menu');
          menu.classList.toggle('active');
          overlay.classList.toggle('active');
          // Cambiar icono del botón
          const toggleBtn = document.getElementById('dashboard-nav-toggle');
          if (toggleBtn) {
            toggleBtn.textContent = menu.classList.contains('active') ? '✕' : '☰';
          }
        }
      }
    }, "☰"),
    el("div", { class: "dashboard-nav-overlay", id: "dashboard-nav-overlay", onclick: () => {
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
    }}),
    el("ul", {},
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
        el("a", { href: "#dashboard-hierarchy", "data-section": "hierarchy" }, "🌐 Jerarquía")
      ),
      el("li", {},
        el("a", { href: "#dashboard-device-selector", "data-section": "device-selector" }, "📱 Dispositivos")
      ),
      el("li", {},
        el("a", { href: "#dashboard-mqtt-logs", "data-section": "mqtt-logs" }, "📝 Logs MQTT")
      )
    )
  );

  // Añadir IDs y clases a cada sección
  const header = el("div", { 
    id: "dashboard-header",
    class: "dashboard-section dashboard-header card card-feature" 
  },
    el("h2", { class: "text-2xl font-bold mb-2" }, "Panel de dispositivos IoT"),
    el("p", { class: "muted text-lg" }, `Proyecto actual: ${currentProject ?? "—"}`)
  );

  // Widget de estado general con indicadores LED
  const generalStatus = await generalStatusWidget();
  if (generalStatus) {
    generalStatus.id = "dashboard-general-status";
    generalStatus.classList.add("dashboard-section", "dashboard-general-status");
  }

  // Widget de estado del sistema (gateways, endpoints, sensores)
  const systemStatus = await systemStatusWidget();
  if (systemStatus) {
    systemStatus.id = "dashboard-system-status";
    systemStatus.classList.add("dashboard-section", "dashboard-system-status");
  }

  // Widget de estructura jerárquica Gateway → Endpoints → Sensores
  const hierarchyWidget = createHierarchyWidget();
  hierarchyWidget.id = "dashboard-hierarchy";
  hierarchyWidget.classList.add("dashboard-section", "dashboard-hierarchy");

  // Widget de logs MQTT en tiempo real
  const mqttLogs = mqttLogsWidget();
  if (mqttLogs) {
    mqttLogs.id = "dashboard-mqtt-logs";
    mqttLogs.classList.add("dashboard-section", "dashboard-mqtt-logs");
  }

  // Widget de alertas activas
  const alertsWidget = alertWidget();
  if (alertsWidget) {
    alertsWidget.id = "dashboard-alerts";
    alertsWidget.classList.add("dashboard-section", "dashboard-alerts");
  }

  // Selector de dispositivos
  const deviceSelector = await deviceSelectorWidget();
  if (deviceSelector) {
    deviceSelector.id = "dashboard-device-selector";
    deviceSelector.classList.add("dashboard-section", "dashboard-device-selector");
  }
  
  // Información del dispositivo seleccionado (solo se muestra si hay un dispositivo seleccionado)
  const deviceInfo = selectedDevice ? selectedDeviceInfoWidget() : null;
  if (deviceInfo) {
    deviceInfo.id = "dashboard-device-info";
    deviceInfo.classList.add("dashboard-section", "dashboard-device-info");
  }

  // Visualización SVG del dispositivo (solo se muestra si hay un dispositivo seleccionado)
  const deviceVisualization = selectedDevice ? await deviceVisualizationWidget(selectedDevice) : null;
  if (deviceVisualization) {
    deviceVisualization.id = "dashboard-device-visualization";
    deviceVisualization.classList.add("dashboard-section", "dashboard-device-visualization");
  }

  // Contenedor para datos específicos del dispositivo
  const deviceDataContainer = el("div", {
    id: "device-data-container",
    class: "dashboard-section dashboard-device-data",
    style: "display: none; margin-top: 0;"
  });

  // Función para cargar datos de un sensor específico
  async function loadSensorData(device) {
    try {
      const sensorId = device.id_dispositivo;
      
      deviceDataContainer.innerHTML = "";
      deviceDataContainer.appendChild(el("div", {
        style: "text-align: center; padding: 20px; color: #666;"
      }, `Cargando datos del sensor ${sensorId}...`));

      // Obtener datos históricos del sensor desde la API
      const sensorData = await deviceService.getDeviceSensorData(sensorId, 50);
      const deviceDetails = await deviceService.getDeviceDetails(sensorId);

      if (!deviceDetails) {
        throw new Error('Sensor no encontrado');
      }

      // Crear card de información del sensor
      const sensorInfoCard = el("div", { class: "card" },
        el("h3", {}, `🌡️ Sensor: ${sensorId}`),
        el("div", { class: "grid cols-2" },
          el("div", {},
            el("p", {}, el("strong", {}, "Nombre: "), deviceDetails.nombre || sensorId),
            el("p", {}, el("strong", {}, "Ubicación: "), deviceDetails.ubicacion || 'N/A'),
            el("p", {}, el("strong", {}, "Estado: "), deviceDetails.estado || 'N/A')
          ),
          el("div", {},
            el("p", {}, el("strong", {}, "Total de lecturas: "), sensorData?.length || 0),
            el("p", {}, el("strong", {}, "Tipo: "), "Sensor")
          )
        )
      );
      
      deviceDataContainer.appendChild(sensorInfoCard);

      // Los gráficos se actualizarán automáticamente cuando se seleccione el sensor
      // No necesitamos crear una tabla adicional aquí ya que el gráfico mostrará todo

    } catch (error) {
      console.error('Error cargando datos del sensor:', error);
      deviceDataContainer.innerHTML = "";
      deviceDataContainer.appendChild(el("div", {
        class: "card",
        style: "text-align: center; color: #d32f2f; padding: 40px;"
      },
        el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
        el("h3", { style: "margin-bottom: 10px;" }, "Error"),
        el("p", {}, error.message || "Error cargando datos del sensor"),
        el("button", {
          class: "btn btn-secondary",
          style: "margin-top: 20px;",
          onclick: () => loadSensorData(device)
        }, "🔄 Reintentar")
      ));
    }
  }

  // Función para cargar datos de todos los sensores de un endpoint
  async function loadEndpointSensorData(device) {
    try {
      const endpointId = device.id_dispositivo;
      
      deviceDataContainer.innerHTML = "";
      deviceDataContainer.appendChild(el("div", {
        style: "text-align: center; padding: 20px; color: #666;"
      }, `Cargando sensores del endpoint ${endpointId}...`));

      // Obtener datos del endpoint con sus sensores desde la API
      const endpointData = await GatewayAPI.getEndpointById(endpointId);
      
      if (!endpointData || !endpointData.success) {
        throw new Error('No se pudieron obtener los datos del endpoint');
      }

      const { endpoint, sensors } = endpointData.data;
      
      // Card de información del endpoint
      const endpointInfoCard = el("div", { class: "card" },
        el("h3", {}, `🔌 Endpoint: ${endpointId}`),
        el("div", { class: "grid cols-2" },
          el("div", {},
            el("p", {}, el("strong", {}, "Nombre: "), device.nombre || endpointId),
            el("p", {}, el("strong", {}, "Ubicación: "), device.ubicacion || endpoint.ubicacion || 'N/A'),
            el("p", {}, el("strong", {}, "Estado: "), device.estado || endpoint.status || 'N/A')
          ),
          el("div", {},
            el("p", {}, el("strong", {}, "Batería: "), `${endpoint.bateria || 'N/A'}%`),
            el("p", {}, el("strong", {}, "LoRa: "), endpoint.lora || 'N/A'),
            el("p", {}, el("strong", {}, "Total de sensores: "), sensors?.length || 0)
          )
        )
      );
      
      deviceDataContainer.appendChild(endpointInfoCard);
      
      // Mostrar información de los sensores asociados
      if (sensors && sensors.length > 0) {
        const sensorsInfoCard = el("div", { class: "card" },
          el("h3", {}, "📡 Sensores Asociados"),
          el("div", { style: "overflow-x: auto;" },
            el("table", { style: "width: 100%; border-collapse: collapse;" },
              el("thead", {},
                el("tr", { style: "background-color: #f5f5f5;" },
                  el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "ID Sensor"),
                  el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Posición"),
                  el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Temperatura (°C)"),
                  el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Humedad (%)"),
                  el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Estado")
                )
              ),
              el("tbody", {},
                ...sensors.map(sensor => 
                  el("tr", {},
                    el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, sensor.id || 'N/A'),
                    el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, sensor.posicion || 'N/A'),
                    el("td", { 
                      style: `padding: 8px; border: 1px solid #ddd; color: ${sensor.temperatura && (sensor.temperatura < 15 || sensor.temperatura > 30) ? '#d32f2f' : '#4CAF50'};`
                    }, `${sensor.temperatura !== undefined && sensor.temperatura !== null ? sensor.temperatura + '°C' : 'N/A'}`),
                    el("td", { 
                      style: `padding: 8px; border: 1px solid #ddd; color: ${sensor.humedad && (sensor.humedad < 30 || sensor.humedad > 80) ? '#d32f2f' : '#4CAF50'};`
                    }, `${sensor.humedad !== undefined && sensor.humedad !== null ? sensor.humedad + '%' : 'N/A'}`),
                    el("td", { 
                      style: `padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${sensor.estado === 'ok' ? '#4CAF50' : '#d32f2f'};`
                    }, sensor.estado || 'N/A')
                  )
                )
              )
            )
          )
        );
        
        deviceDataContainer.appendChild(sensorsInfoCard);
      } else {
        deviceDataContainer.appendChild(el("div", { class: "card" },
          el("p", { style: "text-align: center; color: #666; padding: 20px;" }, 
            "📭 Este endpoint no tiene sensores asociados aún"
          )
        ));
      }

      // Los gráficos mostrarán las lecturas de todos los sensores del endpoint
      // Se actualizarán automáticamente cuando se seleccione el endpoint

    } catch (error) {
      console.error('Error cargando datos del endpoint:', error);
      deviceDataContainer.innerHTML = "";
      deviceDataContainer.appendChild(el("div", {
        class: "card",
        style: "text-align: center; color: #d32f2f; padding: 40px;"
      },
        el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
        el("h3", { style: "margin-bottom: 10px;" }, "Error"),
        el("p", {}, error.message || "Error cargando datos del endpoint"),
        el("button", {
          class: "btn btn-secondary",
          style: "margin-top: 20px;",
          onclick: () => loadEndpointSensorData(device)
        }, "🔄 Reintentar")
      ));
    }
  }

  // Función para cargar datos del dispositivo seleccionado
  async function loadDeviceData(device) {
    try {
      // Limpiar contenedor anterior
      deviceDataContainer.innerHTML = "";
      
      // Verificar que el dispositivo tiene el campo id_dispositivo
      if (!device || !device.id_dispositivo) {
        deviceDataContainer.appendChild(el("div", { class: "card" },
          el("div", { style: "text-align: center; color: #d32f2f; padding: 20px;" }, 
            "❌ Error: Dispositivo inválido o sin identificador"
          )
        ));
        return;
      }

      // Validar que solo se seleccionen endpoints o sensores
      if (device.tipo === 'gateway') {
        deviceDataContainer.appendChild(el("div", { class: "card" },
          el("div", { style: "text-align: center; color: #d32f2f; padding: 20px;" }, 
            "⚠️ No se pueden mostrar lecturas de un Gateway. Por favor selecciona un Endpoint o Sensor."
          )
        ));
        return;
      }
      
      // Mostrar indicador de carga
      deviceDataContainer.appendChild(el("div", {
        style: "text-align: center; padding: 20px; color: #666;"
      }, "Cargando datos del dispositivo..."));
      
      // Si es un endpoint, cargar datos de todos sus sensores
      if (device.tipo === 'endpoint') {
        await loadEndpointSensorData(device);
        return;
      }

      // Si es un sensor, cargar solo sus datos
      if (device.tipo === 'sensor') {
        await loadSensorData(device);
        return;
      }

      // Obtener datos del dispositivo usando el servicio optimizado
      const [deviceDetails, sensorData] = await Promise.all([
        deviceService.getDeviceDetails(device.id_dispositivo),
        deviceService.getDeviceSensorData(device.id_dispositivo, 50)
      ]);

      // Verificar que recibimos datos válidos
      if (deviceDetails && (sensorData || sensorData === null)) {
        // Obtener estadísticas del dispositivo
        const stats = await deviceService.getDeviceStats(device.id_dispositivo);
        
        // Crear widgets de datos específicos del dispositivo
        const deviceStats = el("div", { class: "card" },
          el("h3", {}, "Estadísticas del Dispositivo"),
          el("div", { class: "grid cols-2" },
            el("div", {},
              el("h4", {}, "Datos de Sensores"),
              el("ul", { style: "list-style: none; padding: 0;" },
                el("li", { style: "margin-bottom: 8px;" }, 
                  el("strong", {}, "Total de datos: "), stats.total_datos || 0
                ),
                el("li", { style: "margin-bottom: 8px;" }, 
                  el("strong", {}, "Tipos de sensores: "), stats.tipos_sensor || 0
                ),
                el("li", { style: "margin-bottom: 8px;" }, 
                  el("strong", {}, "Promedio de valores: "), 
                  stats.promedio_valor ? 
                    parseFloat(stats.promedio_valor).toFixed(2) : 'N/A'
                )
              )
            ),
            el("div", {},
              el("h4", {}, "Período de Datos"),
              el("ul", { style: "list-style: none; padding: 0;" },
                el("li", { style: "margin-bottom: 8px;" }, 
                  el("strong", {}, "Primer dato: "), 
                  stats.primer_dato ? 
                    new Date(stats.primer_dato).toLocaleString() : 'N/A'
                ),
                el("li", { style: "margin-bottom: 8px;" }, 
                  el("strong", {}, "Último dato: "), 
                  stats.ultimo_dato ? 
                    new Date(stats.ultimo_dato).toLocaleString() : 'N/A'
                )
              )
            )
          )
        );

        // Crear tabla de datos de sensores recientes
        const sensorDataTable = el("div", { class: "card" },
          el("h3", {}, "Datos de Sensores Recientes"),
          sensorData.length > 0 ? 
            el("div", { style: "overflow-x: auto;" },
              el("table", { style: "width: 100%; border-collapse: collapse;" },
                el("thead", {},
                  el("tr", { style: "background-color: #f5f5f5;" },
                    el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Tipo de Sensor"),
                    el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Valor"),
                    el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Unidad"),
                    el("th", { style: "padding: 10px; text-align: left; border: 1px solid #ddd;" }, "Timestamp")
                  )
                ),
                el("tbody", {},
                  ...sensorData.slice(0, 10).map(data => 
                    el("tr", {},
                      el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, data.tipo_sensor),
                      el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, data.valor),
                      el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, data.unidad || 'N/A'),
                      el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, 
                        new Date(data.timestamp).toLocaleString()
                      )
                    )
                  )
                )
              )
            ) :
            el("p", { style: "text-align: center; color: #666; padding: 20px;" }, 
              "No hay datos de sensores disponibles para este dispositivo"
            )
        );

        // Limpiar y agregar nuevos elementos
        deviceDataContainer.innerHTML = "";
        deviceDataContainer.appendChild(deviceStats);
        deviceDataContainer.appendChild(sensorDataTable);
      } else {
        // Caso: dispositivo existe pero no tiene datos de sensores
        deviceDataContainer.innerHTML = "";
        deviceDataContainer.appendChild(el("div", { class: "card" },
          el("div", { style: "text-align: center; padding: 40px; color: #666;" },
            el("h3", { style: "margin-bottom: 15px;" }, "⚠️ Sin Datos de Sensores"),
            el("p", {}, 
              "El dispositivo existe pero aún no tiene datos de sensores registrados. " +
              "Los datos aparecerán aquí cuando el dispositivo comience a enviar información."
            )
          )
        ));
      }
    } catch (error) {
      console.error('Error cargando datos del dispositivo:', error);
      deviceDataContainer.innerHTML = "";
      
      // Mensaje de error más descriptivo
      let errorMessage = "Error cargando datos del dispositivo";
      if (error.message) {
        errorMessage += ": " + error.message;
      }
      
      deviceDataContainer.appendChild(el("div", {
        class: "card",
        style: "text-align: center; color: #d32f2f; padding: 40px;"
      },
        el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
        el("h3", { style: "margin-bottom: 10px;" }, "Error"),
        el("p", {}, errorMessage),
        el("button", {
          class: "btn btn-secondary",
          style: "margin-top: 20px;",
          onclick: () => loadDeviceData(device)
        }, "🔄 Reintentar")
      ));
    }
  }

  // Variable para almacenar el gráfico actual (para poder actualizarlo)
  let currentTemperatureChart = null;
  let deviceSpecificCards = null;
  let currentSelectedDevice = null; // Para reconstruir el gráfico cuando cambie la configuración

  // Función para actualizar el gráfico cuando cambia el dispositivo
  async function updateTemperatureChart(device) {
    // Guardar dispositivo actual para poder reconstruir el gráfico cuando cambie la configuración
    currentSelectedDevice = device;
    
    // Si hay un gráfico anterior, limpiarlo primero
    if (currentTemperatureChart && currentTemperatureChart.parentNode) {
      currentTemperatureChart.parentNode.removeChild(currentTemperatureChart);
      currentTemperatureChart = null;
    }

    if (!device || (device.tipo !== 'sensor' && device.tipo !== 'endpoint')) {
      return null;
    }

    // Determinar IDs de sensores a mostrar
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

    // Leer configuración actual (por perfil)
    const config = configService.getVisualizationConfig();
    const maxPoints = config.chartPoints || 60;

    // Crear nuevo gráfico con configuración actual
    currentTemperatureChart = await temperatureChartWidget({ 
      title: device.tipo === 'sensor' 
        ? `Temperatura - Sensor ${device.id_dispositivo}`
        : `Temperatura - Endpoint ${device.id_dispositivo} (${endpointSensorIds.length} sensores)`,
      maxPoints: maxPoints,
      showStats: true,
      deviceId: device.id_dispositivo,
      deviceType: device.tipo,
      endpointSensorIds: endpointSensorIds
    });

    return currentTemperatureChart;
  }

  // Función para reconstruir las cards de dispositivos
  async function rebuildDeviceSpecificCards(device) {
    if (!device || (device.tipo !== 'sensor' && device.tipo !== 'endpoint')) {
      deviceSpecificCards = el("div", { class: "card" },
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
      return;
    }

    // Crear gráfico para el dispositivo
    let temperatureChart = null;
    try {
      temperatureChart = await updateTemperatureChart(device);
      if (!temperatureChart) {
        console.warn('[Dashboard] updateTemperatureChart retornó null para:', device.id_dispositivo);
      }
    } catch (error) {
      console.error('[Dashboard] Error creando gráfico de temperatura:', error);
    }

    // Gráfico demo original (mantenido para compatibilidad)
    const rtChart = await chartWidget({ 
      title: `Métrica RT - ${device.nombre}`, 
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
            el("span", {}, device.tipo === 'sensor' ? '🌡️ Sensor' : '🔌 Endpoint')
          ),
          el("li", { class: "flex justify-between" }, 
            el("span", { class: "font-medium" }, "Estado:"), 
            el("span", { class: `status-indicator ${device.estado === 'en_linea' ? 'status-online' : 'status-offline'}` }, 
              el("span", { class: "status-dot" }),
              device.estado || 'N/A'
            )
          ),
          el("li", { class: "flex justify-between" }, 
            el("span", { class: "font-medium" }, "Última conexión:"), 
            el("span", { class: "text-sm" }, device.ultima_conexion ? new Date(device.ultima_conexion).toLocaleString() : 'N/A')
          )
        )
      ),
      rtChart
    );

    const actions = el("div", { class: "card" },
      el("h3", {}, "Acciones del Dispositivo"),
      el("p", { class: "muted" }, `Acciones específicas para ${device.nombre} (solo admin/action).`),
      el("div", {},
        role === "readonly"
          ? el("div", { class: "muted" }, "Solo lectura: no hay acciones disponibles.")
          : el("div", { style: "display: flex; gap: 10px;" },
              el("button", { class: "btn" }, "Ver Histórico"),
              el("button", { class: "btn" }, "Exportar Datos")
            )
      )
    );

    deviceSpecificCards = el("div", {
      style: "display: flex; flex-direction: column; gap: var(--espaciado-lg); width: 100%;"
    },
      temperatureChart || el("div", { 
        class: "card",
        style: "text-align: center; padding: 40px; color: #666;"
      }, "⏳ Cargando gráfico..."),
      grids,
      actions
    );
    
    // Log para debugging
    if (temperatureChart) {
      console.log('[Dashboard] Gráfico de temperatura creado correctamente para:', device.id_dispositivo);
    } else {
      console.warn('[Dashboard] No se pudo crear el gráfico de temperatura para:', device.id_dispositivo);
    }
  }

  // Event listener para cuando se selecciona un dispositivo
  deviceSelector.addEventListener('deviceSelected', async (e) => {
    const device = e.detail.device;
    
    // Mostrar contenedores al seleccionar dispositivo
    deviceDataContainer.style.display = "block";
    deviceCardsContainer.style.display = "block";
    
    // Mostrar indicador de carga
    deviceDataContainer.innerHTML = "";
    deviceDataContainer.appendChild(el("div", {
      style: "text-align: center; padding: 20px; color: #666;"
    }, "Cargando datos del dispositivo..."));
    
    deviceCardsContainer.innerHTML = "";
    deviceCardsContainer.appendChild(el("div", {
      style: "text-align: center; padding: 20px; color: #666;"
    }, "Cargando gráfico..."));
    
    try {
      await loadDeviceData(device);
      
      // Reconstruir las cards del dispositivo (incluye el gráfico)
      await rebuildDeviceSpecificCards(device);
      
      // Actualizar el DOM con las nuevas cards
      if (deviceSpecificCards) {
        deviceCardsContainer.innerHTML = '';
        deviceCardsContainer.appendChild(deviceSpecificCards);
      }
    } catch (error) {
      console.error('[Dashboard] Error al cargar dispositivo:', error);
      deviceDataContainer.innerHTML = "";
      deviceDataContainer.appendChild(el("div", {
        class: "card",
        style: "text-align: center; color: #d32f2f; padding: 20px;"
      }, "Error al cargar datos del dispositivo"));
      
      deviceCardsContainer.innerHTML = "";
      deviceCardsContainer.appendChild(el("div", {
        class: "card",
        style: "text-align: center; color: #d32f2f; padding: 20px;"
      }, "Error al cargar gráfico"));
    }
  });

  // Suscripción a cambios en la configuración de visualización
  let configUnsubscribe = null;
  try {
    configUnsubscribe = configService.onConfigChange('visualization_config', async (newConfig) => {
      console.log('[Dashboard] Configuración de visualización actualizada:', newConfig);
      
      // Si hay un dispositivo seleccionado, reconstruir el gráfico con la nueva configuración
      if (currentSelectedDevice && (currentSelectedDevice.tipo === 'sensor' || currentSelectedDevice.tipo === 'endpoint')) {
        console.log('[Dashboard] Reconstruyendo gráfico con nueva configuración...');
        await rebuildDeviceSpecificCards(currentSelectedDevice);
        
        // Actualizar el DOM con las nuevas cards
        const container = document.querySelector('[data-device-cards-container]');
        if (container && deviceSpecificCards) {
          container.innerHTML = '';
          container.appendChild(deviceSpecificCards);
        }
      }
    });
  } catch (error) {
    console.warn('[Dashboard] Error suscribiéndose a cambios de configuración:', error);
  }

  // Si ya hay un dispositivo seleccionado, cargar sus datos
  if (selectedDevice && (selectedDevice.tipo === 'sensor' || selectedDevice.tipo === 'endpoint')) {
    await loadDeviceData(selectedDevice);
    await rebuildDeviceSpecificCards(selectedDevice);
  } else {
    await rebuildDeviceSpecificCards(null);
  }
  
  // Limpieza cuando se navega fuera de la página
  const cleanupConfig = () => {
    if (configUnsubscribe) {
      configUnsubscribe();
    }
  };
  
  // Escuchar evento de navegación para limpiar
  window.addEventListener('beforeunload', cleanupConfig);


  // Contenedor para las cards específicas del dispositivo
  const deviceCardsContainer = el("div", {
    "data-device-cards-container": true,
    class: "dashboard-section dashboard-device-cards",
    style: "display: none;"
  });
  
  if (deviceSpecificCards) {
    deviceCardsContainer.appendChild(deviceSpecificCards);
    deviceCardsContainer.style.display = "block";
    deviceDataContainer.style.display = "block";
  }

  // Crear contenedor principal con layout vertical (mqtt logs al final)
  // Pares de elementos lado a lado para optimizar espacio
  const dashboardContainer = el("div", { class: "dashboard-container" },
    header,
    // Fila 1: Estado General y Estado del Sistema
    el("div", { class: "dashboard-row" },
      generalStatus,
      systemStatus
    ),
    // Fila 2: Alertas y Jerarquía
    el("div", { class: "dashboard-row" },
      alertsWidget,
      hierarchyWidget
    ),
    // Selector de dispositivos (ancho completo)
    deviceSelector,
    // Fila 3: Info del dispositivo y Visualización (solo si hay dispositivo seleccionado)
    ...(selectedDevice && deviceInfo && deviceVisualization ? [
      el("div", { class: "dashboard-row" },
        deviceInfo,
        deviceVisualization
      )
    ] : []),
    // Datos del dispositivo (siempre presente, oculto si no hay dispositivo)
    deviceDataContainer,
    // Cards específicas del dispositivo (siempre presente, oculto si no hay dispositivo)
    deviceCardsContainer,
    // Logs MQTT al final (ancho completo)
    mqttLogs
  );

  // Inicializar navegación activa y scroll (sin script inline)
  // Limpiar handlers anteriores si existen
  if (window.__dashboardNavScrollHandler) {
    window.removeEventListener('scroll', window.__dashboardNavScrollHandler);
    window.__dashboardNavScrollHandler = null;
  }
  
  // Configurar navegación después de que el DOM esté listo
  setTimeout(() => {
    const navLinks = document.querySelectorAll('.dashboard-nav-menu a[data-section]');
    const sections = document.querySelectorAll('.dashboard-section');
    
    // Función para actualizar link activo
    function updateActiveLink() {
      const scrollPos = window.scrollY + 100;
      
      sections.forEach((section) => {
        const top = section.offsetTop;
        const bottom = top + section.offsetHeight;
        
        if (scrollPos >= top && scrollPos < bottom) {
          navLinks.forEach(link => link.classList.remove('active'));
          const sectionId = section.id ? section.id.replace('dashboard-', '') : '';
          const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }
      });
    }
    
    // Event listeners para navegación
    navLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const target = document.querySelector(targetId);
        if (target) {
          const navMenu = document.querySelector('.dashboard-nav-menu');
          const navbar = document.querySelector('.navbar');
          const offsetTop = target.offsetTop - (navMenu ? navMenu.offsetHeight : 0) - (navbar ? navbar.offsetHeight : 0);
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
          
          // Cerrar menú móvil si está abierto
          if (navMenu && navMenu.classList.contains('mobile-menu')) {
            const overlay = document.getElementById('dashboard-nav-overlay');
            navMenu.classList.remove('mobile-menu', 'active');
            if (overlay) overlay.classList.remove('active');
            const toggleBtn = document.getElementById('dashboard-nav-toggle');
            if (toggleBtn) toggleBtn.textContent = '☰';
          }
        }
      });
    });
    
    // Configurar scroll handler
    window.__dashboardNavScrollHandler = updateActiveLink;
    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink(); // Inicial
  }, 100);

  const pageContainer = el("div", {},
    dashboardNav,
    dashboardContainer
  );
  
  // Limpieza cuando se navega fuera
  const cleanupDashboard = () => {
    // Limpiar config unsubscribe
    if (configUnsubscribe) {
      configUnsubscribe();
    }
    // Limpiar scroll handler
    if (window.__dashboardNavScrollHandler) {
      window.removeEventListener('scroll', window.__dashboardNavScrollHandler);
      window.__dashboardNavScrollHandler = null;
    }
  };
  
  // Retornar el contenedor con función de limpieza
  pageContainer.cleanup = cleanupDashboard;
  
  return pageContainer;
}

// ==========================
// Widget de Estructura Jerárquica Gateway → Endpoints → Sensores
// ==========================
function createHierarchyWidget() {
  const container = el("div", {
    class: "card",
    id: "hierarchy-widget",
    style: "margin-top: 20px;"
  },
    el("div", { 
      style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;" 
    },
      el("h3", { style: "margin: 0;" }, "🌐 Estructura del Sistema IoT"),
      el("button", {
        class: "btn btn-sm",
        id: "refresh-hierarchy-btn",
        style: "padding: 6px 12px;",
        onclick: () => loadHierarchy()
      }, "🔄 Actualizar")
    ),
    el("div", {
      id: "hierarchy-content",
      style: "min-height: 100px;"
    })
  );

  // Cargar jerarquía inicial
  loadHierarchy();

  return container;
}

// Función para organizar dispositivos jerárquicamente (mismo que en dispositivos.js)
function organizeDevicesHierarchy(devices) {
  const gateways = [];
  const endpointsByGateway = {};
  const sensorsByEndpoint = {};
  
  // Paso 1: Identificar gateways
  devices.forEach(device => {
    if (device.tipo === 'gateway') {
      gateways.push(device);
      endpointsByGateway[device.id_dispositivo] = [];
    }
  });
  
  // Paso 2: Asignar endpoints a sus gateways
  devices.forEach(device => {
    if (device.tipo === 'endpoint') {
      const gatewayId = device.id_gateway || null;
      if (gatewayId && endpointsByGateway.hasOwnProperty(gatewayId)) {
        endpointsByGateway[gatewayId].push(device);
        sensorsByEndpoint[device.id_dispositivo] = [];
      }
    }
  });
  
  // Paso 3: Asignar sensores a sus endpoints
  devices.forEach(device => {
    if (device.tipo === 'sensor') {
      const endpointId = device.id_endpoint || null;
      if (endpointId) {
        if (!sensorsByEndpoint[endpointId]) {
          sensorsByEndpoint[endpointId] = [];
        }
        sensorsByEndpoint[endpointId].push(device);
      }
    }
  });
  
  return { gateways, endpointsByGateway, sensorsByEndpoint };
}

// Función para obtener color según estado
function getStatusColor(estado) {
  if (estado === 'en_linea') return '#4CAF50';
  if (estado === 'fuera_linea') return '#FF9800';
  return '#F44336';
}

// Función para cargar y renderizar la jerarquía
async function loadHierarchy() {
  const content = document.getElementById('hierarchy-content');
  if (!content) return;

  content.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Cargando estructura...</div>';

  try {
    // Obtener dispositivos desde la API
    const response = await DevicesAPI.getAllDevices();
    
    if (!response.success || !Array.isArray(response.data)) {
      throw new Error('No se pudieron obtener los dispositivos');
    }

    const devices = response.data;
    if (devices.length === 0) {
      content.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">No hay dispositivos disponibles</div>';
      return;
    }

    // Organizar jerarquía
    const { gateways, endpointsByGateway, sensorsByEndpoint } = organizeDevicesHierarchy(devices);

    // Renderizar jerarquía
    const hierarchyContainer = el("div", {
      style: "display: flex; flex-direction: column; gap: 20px;"
    });

    if (gateways.length === 0) {
      hierarchyContainer.appendChild(el("div", {
        style: "text-align: center; padding: 40px; color: #999;"
      }, "📭 No hay gateways en el sistema"));
    } else {
      gateways.forEach(gateway => {
        const gatewayColor = getStatusColor(gateway.estado);
        const endpoints = endpointsByGateway[gateway.id_dispositivo] || [];
        const totalSensors = endpoints.reduce((total, ep) => {
          return total + (sensorsByEndpoint[ep.id_dispositivo]?.length || 0);
        }, 0);

        const gatewayCard = el("div", {
          class: "card",
          style: `border-left: 5px solid ${gatewayColor}; background: linear-gradient(to right, ${gatewayColor}08, transparent); margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`
        },
          // Header del Gateway
          el("div", {
            style: "display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #e8e8e8;"
          },
            el("div", { style: "flex: 1;" },
              el("div", {
                style: "display: flex; align-items: center; gap: 12px; margin-bottom: 8px;"
              },
                el("span", {
                  style: `width: 14px; height: 14px; border-radius: 50%; background-color: ${gatewayColor}; box-shadow: 0 0 8px ${gatewayColor}60;`
                }),
                el("h4", {
                  style: "margin: 0; color: #1a1a1a; font-size: 1.1em; font-weight: 600;"
                }, `🌐 Gateway ${gateway.id_dispositivo}`)
              ),
              el("div", {
                style: "display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px;"
              },
                el("p", {
                  style: "margin: 0; color: #666; font-size: 0.85em;"
                }, `📍 ${gateway.ubicacion || 'Sin ubicación'}`),
                el("p", {
                  style: "margin: 0; color: #666; font-size: 0.85em; font-weight: 500;"
                }, `🔗 ${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}`),
                el("p", {
                  style: "margin: 0; color: #666; font-size: 0.85em; font-weight: 500;"
                }, `📡 ${totalSensors} sensor${totalSensors !== 1 ? 'es' : ''}`)
              )
            ),
            el("div", {
              style: `padding: 6px 16px; border-radius: 20px; background: ${gatewayColor}15; color: ${gatewayColor}; font-weight: 600; font-size: 0.8em; border: 2px solid ${gatewayColor}40;`
            },
              gateway.estado === 'en_linea' ? '● En Línea' : '○ Fuera de Línea'
            )
          )
        );

        // Contenedor de Endpoints
        if (endpoints.length > 0) {
          const endpointsContainer = el("div", {
            style: "margin-top: 10px; padding-left: 25px; position: relative;"
          },
            el("div", {
              style: `position: absolute; left: 12px; top: 0; bottom: 0; width: 2px; background: linear-gradient(to bottom, ${gatewayColor}40, transparent);`
            })
          );

          endpoints.forEach((endpoint, epIndex) => {
            const endpointColor = getStatusColor(endpoint.estado);
            const sensors = sensorsByEndpoint[endpoint.id_dispositivo] || [];
            const isLastEndpoint = epIndex === endpoints.length - 1;

            const endpointCard = el("div", {
              class: "card",
              style: `margin-bottom: 15px; padding: 15px; border-left: 3px solid ${endpointColor}; background: #fafafa; border-radius: 6px; position: relative;`
            },
              el("div", {
                style: "display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;"
              },
                el("div", { style: "flex: 1;" },
                  el("div", {
                    style: "display: flex; align-items: center; gap: 8px; margin-bottom: 5px;"
                  },
                    el("div", {
                      style: `width: 15px; height: 2px; background: ${gatewayColor}60; position: relative;`
                    },
                      el("div", {
                        style: `position: absolute; right: -6px; top: -5px; width: 10px; height: 10px; border-radius: 50%; background: ${endpointColor}; border: 2px solid white; box-shadow: 0 0 4px ${endpointColor}60;`
                      })
                    ),
                    el("h5", {
                      style: "margin: 0; color: #2a2a2a; font-size: 1em; font-weight: 600;"
                    }, `🔌 Endpoint ${endpoint.id_dispositivo}`)
                  ),
                  el("div", {
                    style: "display: flex; gap: 12px; margin-left: 25px;"
                  },
                    el("p", {
                      style: "margin: 0; color: #666; font-size: 0.8em;"
                    }, `📍 ${endpoint.ubicacion || 'Sin ubicación'}`),
                    el("p", {
                      style: "margin: 0; color: #666; font-size: 0.8em; font-weight: 500;"
                    }, `📡 ${sensors.length} sensor${sensors.length !== 1 ? 'es' : ''}`)
                  )
                ),
                el("div", {
                  style: `padding: 3px 10px; border-radius: 15px; background: ${endpointColor}15; color: ${endpointColor}; font-weight: 600; font-size: 0.7em; border: 1px solid ${endpointColor}30;`
                },
                  endpoint.estado === 'en_linea' ? '● En Línea' : '○ Fuera de Línea'
                )
              )
            );

            // Sensores del endpoint
            if (sensors.length > 0) {
              const sensorsContainer = el("div", {
                style: "margin-top: 10px; padding-left: 30px; position: relative;"
              },
                el("div", {
                  style: `position: absolute; left: 15px; top: 0; bottom: ${isLastEndpoint ? '15px' : '0'}; width: 2px; background: linear-gradient(to bottom, ${endpointColor}30, transparent);`
                })
              );

              sensors.forEach((sensor, sensorIndex) => {
                const sensorColor = getStatusColor(sensor.estado);
                const sensorName = sensor.nombre || `Sensor ${sensor.id_dispositivo}`;
                const isLastSensor = sensorIndex === sensors.length - 1;

                const sensorItem = el("div", {
                  style: `padding: 10px 12px; margin-bottom: ${isLastSensor ? '0' : '6px'}; background: white; border-left: 2px solid ${sensorColor}; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;`
                },
                  el("div", {
                    style: "position: relative; display: flex; align-items: center; gap: 8px; flex: 1;"
                  },
                    el("div", {
                      style: `position: absolute; left: -30px; top: 50%; width: 12px; height: 2px; background: ${endpointColor}40;`
                    },
                      el("div", {
                        style: `position: absolute; right: -5px; top: -4px; width: 8px; height: 8px; border-radius: 50%; background: ${sensorColor}; border: 2px solid white; box-shadow: 0 0 3px ${sensorColor}50;`
                      })
                    ),
                    el("span", {
                      style: `width: 8px; height: 8px; border-radius: 50%; background-color: ${sensorColor};`
                    }),
                    el("span", { style: "font-weight: 500; font-size: 0.85em; color: #444;" }, "🌡️"),
                    el("span", { style: "font-weight: 500; font-size: 0.85em; color: #444;" }, sensorName)
                  ),
                  el("span", {
                    style: `padding: 3px 8px; border-radius: 10px; background: ${sensorColor}15; color: ${sensorColor}; font-weight: 600; font-size: 0.7em; border: 1px solid ${sensorColor}25;`
                  },
                    sensor.estado === 'en_linea' ? '● Activo' : '○ Inactivo'
                  )
                );

                sensorsContainer.appendChild(sensorItem);
              });

              endpointCard.appendChild(sensorsContainer);
            } else {
              endpointCard.appendChild(el("div", {
                style: "margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 5px; text-align: center; color: #999; font-size: 0.75em; margin-left: 25px;"
              }, "📭 Sin sensores"));
            }

            endpointsContainer.appendChild(endpointCard);
          });

          gatewayCard.appendChild(endpointsContainer);
        } else {
          gatewayCard.appendChild(el("div", {
            style: "margin-top: 15px; padding: 15px; background: #f9f9f9; border-radius: 8px; text-align: center; color: #999;"
          }, "📭 Sin endpoints asociados"));
        }

        hierarchyContainer.appendChild(gatewayCard);
      });
    }

    content.innerHTML = '';
    content.appendChild(hierarchyContainer);

  } catch (error) {
    console.error('Error cargando jerarquía:', error);
    content.innerHTML = el("div", {
      style: "text-align: center; padding: 40px; color: #d32f2f;"
    },
      el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
      el("h4", { style: "margin-bottom: 10px;" }, "Error"),
      el("p", { style: "margin-bottom: 15px;" }, error.message || "Error cargando estructura jerárquica"),
      el("button", {
        class: "btn btn-sm",
        onclick: () => loadHierarchy()
      }, "🔄 Reintentar")
    ).outerHTML;
  }
}
