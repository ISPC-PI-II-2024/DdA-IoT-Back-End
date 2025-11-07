// ==========================
// Widget de Estructura Jerárquica Gateway → Endpoints → Sensores
// ==========================

import { el } from "../utils/dom.js";
import { DevicesAPI } from "../api.js";
import { getStatusColor as getStatusColorUtil } from "../utils/uiComponents.js";

export function createHierarchyWidget() {
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

// Función para organizar dispositivos jerárquicamente
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
  return getStatusColorUtil(estado || 'offline');
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
    const hierarchyData = organizeDevicesHierarchy(devices);
    const gateways = hierarchyData.gateways;
    const endpointsByGateway = hierarchyData.endpointsByGateway;
    const sensorsByEndpoint = hierarchyData.sensorsByEndpoint;

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

        const gatewayCardStyle = `border-left: 5px solid ${gatewayColor}; background: linear-gradient(to right, ${gatewayColor}08, transparent); margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`;
        const gatewayCard = el("div", {
          class: "card",
          style: gatewayCardStyle
        },
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
                }, `🔗 ${endpoints.length} ${endpoints.length !== 1 ? 'endpoints' : 'endpoint'}`),
                el("p", {
                  style: "margin: 0; color: #666; font-size: 0.85em; font-weight: 500;"
                }, `📡 ${totalSensors} ${totalSensors !== 1 ? 'sensores' : 'sensor'}`)
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

            const endpointCardStyle = `margin-bottom: 15px; padding: 15px; border-left: 3px solid ${endpointColor}; background: #fafafa; border-radius: 6px; position: relative;`;
            const endpointCard = el("div", {
              class: "card",
              style: endpointCardStyle
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
                    }, `📡 ${sensors.length} ${sensors.length !== 1 ? 'sensores' : 'sensor'}`)
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
              const bottomValue = isLastEndpoint ? '15px' : '0';
              const sensorsContainer = el("div", {
                style: "margin-top: 10px; padding-left: 30px; position: relative;"
              },
                el("div", {
                  style: `position: absolute; left: 15px; top: 0; bottom: ${bottomValue}; width: 2px; background: linear-gradient(to bottom, ${endpointColor}30, transparent);`
                })
              );

              sensors.forEach((sensor, sensorIndex) => {
                const sensorColor = getStatusColor(sensor.estado);
                const sensorName = sensor.nombre || `Sensor ${sensor.id_dispositivo}`;
                const isLastSensor = sensorIndex === sensors.length - 1;
                const marginBottom = isLastSensor ? '0' : '6px';

                const sensorItemStyle = `padding: 10px 12px; margin-bottom: ${marginBottom}; background: white; border-left: 2px solid ${sensorColor}; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;`;
                const sensorItem = el("div", {
                  style: sensorItemStyle
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
                style: "margin-top: 10px; padding-left: 30px; color: #999; font-size: 0.85em;"
              }, "📭 Sin sensores"));
            }

            endpointsContainer.appendChild(endpointCard);
          });

          gatewayCard.appendChild(endpointsContainer);
        } else {
          gatewayCard.appendChild(el("div", {
            style: "margin-top: 10px; padding-left: 25px; color: #999; font-size: 0.85em;"
          }, "📭 Sin endpoints asociados"));
        }

        hierarchyContainer.appendChild(gatewayCard);
      });
    }

    content.innerHTML = '';
    content.appendChild(hierarchyContainer);

  } catch (error) {
    console.error('Error cargando jerarquía:', error);
    const errorContainer = el("div", {
      style: "text-align: center; padding: 40px; color: #d32f2f;"
    },
      el("div", { style: "font-size: 3em; margin-bottom: 15px;" }, "❌"),
      el("h4", { style: "margin-bottom: 10px;" }, "Error al cargar estructura"),
      el("p", { style: "margin-bottom: 15px;" }, error.message || "Error cargando estructura jerárquica"),
      el("button", {
        class: "btn btn-sm",
        onclick: () => loadHierarchy()
      }, "🔄 Reintentar")
    );
    content.innerHTML = '';
    content.appendChild(errorContainer);
  }
}

