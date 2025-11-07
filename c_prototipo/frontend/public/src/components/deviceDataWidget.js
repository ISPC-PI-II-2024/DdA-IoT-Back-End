// ==========================
// Widget para mostrar datos de dispositivos seleccionados
// Maneja la carga y visualización de datos de sensores y endpoints
// ==========================

import { el } from "../utils/dom.js";
import { GatewayAPI } from "../api.js";
import { deviceService } from "../utils/deviceService.js";
import { formatters } from "../utils/uiComponents.js";

export function createDeviceDataWidget() {
  const container = el("div", {
    id: "device-data-container",
    class: "dashboard-section dashboard-device-data",
    style: "display: none; margin-top: 0;"
  });

  return container;
}

export async function loadSensorData(device, container) {
  try {
    const sensorId = device.id_dispositivo;
    
    container.innerHTML = "";
    container.appendChild(el("div", {
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
    
    container.innerHTML = "";
    container.appendChild(sensorInfoCard);

  } catch (error) {
    console.error('Error cargando datos del sensor:', error);
    container.innerHTML = "";
    container.appendChild(el("div", {
      class: "card",
      style: "text-align: center; color: #d32f2f; padding: 40px;"
    },
      el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
      el("h3", { style: "margin-bottom: 10px;" }, "Error"),
      el("p", {}, error.message || "Error cargando datos del sensor"),
      el("button", {
        class: "btn btn-secondary",
        style: "margin-top: 20px;",
        onclick: () => loadSensorData(device, container)
      }, "🔄 Reintentar")
    ));
  }
}

export async function loadEndpointSensorData(device, container) {
  try {
    const endpointId = device.id_dispositivo;
    
    container.innerHTML = "";
    container.appendChild(el("div", {
      style: "text-align: center; padding: 20px; color: #666;"
    }, `Cargando sensores del endpoint ${endpointId}...`));

    // Obtener datos del endpoint con sus sensores desde la API
    const endpointData = await GatewayAPI.getEndpointById(endpointId);
    
    if (!endpointData || !endpointData.success) {
      throw new Error('No se pudieron obtener los datos del endpoint');
    }

    const endpointDataData = endpointData.data;
    const endpoint = endpointDataData.endpoint;
    const sensors = endpointDataData.sensors;
    
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
    
    container.innerHTML = "";
    container.appendChild(endpointInfoCard);
    
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
            (() => {
              const tbody = el("tbody", {});
              sensors.forEach(sensor => {
                const tempColor = sensor.temperatura && (sensor.temperatura < 15 || sensor.temperatura > 30) ? '#d32f2f' : '#4CAF50';
                const humColor = sensor.humedad && (sensor.humedad < 30 || sensor.humedad > 80) ? '#d32f2f' : '#4CAF50';
                const estadoColor = sensor.estado === 'ok' ? '#4CAF50' : '#d32f2f';
                const tempValue = sensor.temperatura !== undefined && sensor.temperatura !== null ? sensor.temperatura + '°C' : 'N/A';
                const humValue = sensor.humedad !== undefined && sensor.humedad !== null ? sensor.humedad + '%' : 'N/A';
                
                tbody.appendChild(el("tr", {},
                  el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, sensor.id || 'N/A'),
                  el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, sensor.posicion || 'N/A'),
                  el("td", { 
                    style: `padding: 8px; border: 1px solid #ddd; color: ${tempColor};`
                  }, tempValue),
                  el("td", { 
                    style: `padding: 8px; border: 1px solid #ddd; color: ${humColor};`
                  }, humValue),
                  el("td", { 
                    style: `padding: 8px; border: 1px solid #ddd; font-weight: bold; color: ${estadoColor};`
                  }, sensor.estado || 'N/A')
                ));
              });
              return tbody;
            })()
          )
        )
      );
      
      container.appendChild(sensorsInfoCard);
    } else {
      container.appendChild(el("div", { class: "card" },
        el("p", { style: "text-align: center; color: #666; padding: 20px;" }, 
          "📭 Este endpoint no tiene sensores asociados aún"
        )
      ));
    }

  } catch (error) {
    console.error('Error cargando datos del endpoint:', error);
    container.innerHTML = "";
    container.appendChild(el("div", {
      class: "card",
      style: "text-align: center; color: #d32f2f; padding: 40px;"
    },
      el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
      el("h3", { style: "margin-bottom: 10px;" }, "Error"),
      el("p", {}, error.message || "Error cargando datos del endpoint"),
      el("button", {
        class: "btn btn-secondary",
        style: "margin-top: 20px;",
        onclick: () => loadEndpointSensorData(device, container)
      }, "🔄 Reintentar")
    ));
  }
}

export async function loadDeviceData(device, container) {
  try {
    container.innerHTML = "";
    
    if (!device || !device.id_dispositivo) {
      container.appendChild(el("div", { class: "card" },
        el("div", { style: "text-align: center; color: #d32f2f; padding: 20px;" }, 
          "❌ Error: Dispositivo inválido o sin identificador"
        )
      ));
      return;
    }

    if (device.tipo === 'gateway') {
      container.appendChild(el("div", { class: "card" },
        el("div", { style: "text-align: center; color: #d32f2f; padding: 20px;" }, 
          "⚠️ No se pueden mostrar lecturas de un Gateway. Por favor selecciona un Endpoint o Sensor."
        )
      ));
      return;
    }
    
    container.appendChild(el("div", {
      style: "text-align: center; padding: 20px; color: #666;"
    }, "Cargando datos del dispositivo..."));
    
    if (device.tipo === 'endpoint') {
      await loadEndpointSensorData(device, container);
      return;
    }

    if (device.tipo === 'sensor') {
      await loadSensorData(device, container);
      return;
    }

    // Obtener datos del dispositivo usando el servicio optimizado
    const [deviceDetails, sensorData] = await Promise.all([
      deviceService.getDeviceDetails(device.id_dispositivo),
      deviceService.getDeviceSensorData(device.id_dispositivo, 50)
    ]);

    if (deviceDetails && (sensorData || sensorData === null)) {
      const stats = await deviceService.getDeviceStats(device.id_dispositivo);
      
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
                  formatters.dateTime(stats.primer_dato, 'short') : 'N/A'
              ),
              el("li", { style: "margin-bottom: 8px;" }, 
                el("strong", {}, "Último dato: "), 
                stats.ultimo_dato ? 
                  formatters.dateTime(stats.ultimo_dato, 'short') : 'N/A'
              )
            )
          )
        )
      );

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
              (() => {
                const tbody = el("tbody", {});
                sensorData.slice(0, 10).forEach(data => {
                  tbody.appendChild(el("tr", {},
                    el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, data.tipo_sensor),
                    el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, data.valor),
                    el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, data.unidad || 'N/A'),
                    el("td", { style: "padding: 8px; border: 1px solid #ddd;" }, 
                      formatters.dateTime(data.timestamp, 'short')
                    )
                  ));
                });
                return tbody;
              })()
            )
          ) :
          el("p", { style: "text-align: center; color: #666; padding: 20px;" }, 
            "No hay datos de sensores disponibles para este dispositivo"
          )
      );

      container.innerHTML = "";
      container.appendChild(deviceStats);
      container.appendChild(sensorDataTable);
    } else {
      container.innerHTML = "";
      container.appendChild(el("div", { class: "card" },
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
    container.innerHTML = "";
    
    let errorMessage = "Error cargando datos del dispositivo";
    if (error.message) {
      errorMessage += ": " + error.message;
    }
    
    container.appendChild(el("div", {
      class: "card",
      style: "text-align: center; color: #d32f2f; padding: 40px;"
    },
      el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
      el("h3", { style: "margin-bottom: 10px;" }, "Error"),
      el("p", {}, errorMessage),
      el("button", {
        class: "btn btn-secondary",
        style: "margin-top: 20px;",
        onclick: () => loadDeviceData(device, container)
      }, "🔄 Reintentar")
    ));
  }
}

