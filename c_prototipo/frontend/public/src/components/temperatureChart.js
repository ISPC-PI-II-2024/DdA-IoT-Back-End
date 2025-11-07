// ==========================
// Temperature Chart Widget para datos MQTT
// - Muestra gráfico de temperatura en tiempo real
// - Conecta con WebSocket para datos MQTT
// - Incluye estadísticas básicas
// ==========================

import { el } from "../utils/dom.js";
import { rtClient } from "../ws.js";
import { mqttTopicsService } from "../utils/mqttTopicsService.js";
import { configService } from "../utils/configService.js";
import { alertService } from "../utils/alertService.js";

export async function temperatureChartWidget({ 
  title = "Temperatura MQTT", 
  maxPoints = null,
  showStats = true,
  topicName = null, // Si se especifica, usa este tópico específico
  deviceId = null, // ID del dispositivo seleccionado (sensor o endpoint)
  deviceType = null, // 'sensor' o 'endpoint'
  endpointSensorIds = [] // IDs de sensores si es un endpoint
} = {}) {
  // Leer configuración de visualización (por perfil)
  const config = configService.getVisualizationConfig();
  
  // Usar configuración o valor por defecto
  const finalMaxPoints = maxPoints || config.chartPoints || 60;
  const temperatureUnit = config.temperatureUnit || "celsius";
  let chartRefreshInterval = Math.max(config.chartRefresh || 15000, 15000); // Mínimo 15 segundos (mutable para actualización dinámica)
  
  // Contenedor de leyenda interactiva (filtros) - se creará después de definir las funciones
  let legendContainer = null;
  
  // Función para renderizar leyenda interactiva
  function renderLegend() {
    if (!legendContainer) return;
    legendContainer.innerHTML = "";
    
    const legendTitle = el("div", {
      style: "font-weight: 600; color: #ffffff; margin-bottom: 10px; font-size: 0.9rem;"
    }, "📊 Filtros de Series (Clic para mostrar/ocultar)");
    legendContainer.appendChild(legendTitle);
    
    const sensors = Array.from(sensorIds).sort();
    
    if (sensors.length === 0) {
      legendContainer.appendChild(el("div", {
        style: "color: #9aa4b2; font-size: 0.85rem; padding: 10px; text-align: center;"
      }, "No hay sensores disponibles"));
      return;
    }
    
    sensors.forEach(sid => {
      const keyT = `${sid}:temp`;
      const keyH = `${sid}:hum`;
      const cT = colorForKey(keyT);
      const cH = colorForKey(keyH);
      const visibleT = isSeriesVisible(keyT);
      const visibleH = isSeriesVisible(keyH);
      
      // Contenedor por sensor
      const sensorGroup = el("div", {
        style: `
          margin-bottom: 12px;
          padding: 8px;
          background: #2a3f5f;
          border-radius: 4px;
          border-left: 3px solid ${cT};
        `
      });
      
      // Título del sensor
      const sensorTitle = el("div", {
        style: "font-weight: 600; color: #ffffff; margin-bottom: 6px; font-size: 0.85rem;"
      }, `Sensor ${sid}`);
      sensorGroup.appendChild(sensorTitle);
      
      // Checkbox para temperatura
      const tempCheckbox = el("label", {
        style: `
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
          user-select: none;
        `,
        onmouseover: (e) => e.target.style.background = "#3a4f6f",
        onmouseout: (e) => e.target.style.background = "transparent",
        onclick: () => {
          toggleSeriesVisibility(keyT);
          renderLegend();
        }
      },
        el("input", {
          type: "checkbox",
          checked: visibleT,
          style: "cursor: pointer;",
          onclick: (e) => e.stopPropagation()
        }),
        el("span", {
          style: `
            display: inline-block;
            width: 16px;
            height: 3px;
            background: ${visibleT ? cT : '#666'};
            border-radius: 2px;
            opacity: ${visibleT ? 1 : 0.5};
          `
        }),
        el("span", {
          style: `color: ${visibleT ? '#ffffff' : '#9aa4b2'}; font-size: 0.85rem;`
        }, "🌡️ Temperatura")
      );
      sensorGroup.appendChild(tempCheckbox);
      
      // Checkbox para humedad
      const humCheckbox = el("label", {
        style: `
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
          user-select: none;
        `,
        onmouseover: (e) => e.target.style.background = "#3a4f6f",
        onmouseout: (e) => e.target.style.background = "transparent",
        onclick: () => {
          toggleSeriesVisibility(keyH);
          renderLegend();
        }
      },
        el("input", {
          type: "checkbox",
          checked: visibleH,
          style: "cursor: pointer;",
          onclick: (e) => e.stopPropagation()
        }),
        el("span", {
          style: `
            display: inline-block;
            width: 16px;
            height: 3px;
            background: ${visibleH ? cH : '#666'};
            border-radius: 2px;
            opacity: ${visibleH ? 1 : 0.5};
            border-style: dashed;
            border-width: 1px;
            border-color: ${visibleH ? cH : '#666'};
          `
        }),
        el("span", {
          style: `color: ${visibleH ? '#ffffff' : '#9aa4b2'}; font-size: 0.85rem;`
        }, "💧 Humedad")
      );
      sensorGroup.appendChild(humCheckbox);
      
      legendContainer.appendChild(sensorGroup);
    });
    
    // Botón "Mostrar todo" / "Ocultar todo"
    const toggleAllContainer = el("div", {
      style: "margin-top: 10px; display: flex; gap: 8px;"
    },
      el("button", {
        class: "btn btn-sm",
        style: "padding: 4px 12px; font-size: 0.8rem; background: #46a0ff; color: white; border: none; border-radius: 4px; cursor: pointer;",
        onclick: () => {
          seriesMap.forEach((arr, key) => {
            seriesVisibility.set(key, true);
          });
          saveFiltersToStorage();
          renderLegend();
          dirty = true;
        }
      }, "✅ Mostrar Todo"),
      el("button", {
        class: "btn btn-sm",
        style: "padding: 4px 12px; font-size: 0.8rem; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;",
        onclick: () => {
          seriesMap.forEach((arr, key) => {
            seriesVisibility.set(key, false);
          });
          saveFiltersToStorage();
          renderLegend();
          dirty = true;
        }
      }, "❌ Ocultar Todo")
    );
    legendContainer.appendChild(toggleAllContainer);
  }
  
  // Crear contenedor de leyenda
  legendContainer = el("div", {
    id: "chart-legend-container",
    style: `
      margin-top: 10px;
      padding: 12px;
      background: #1a1f2e;
      border: 1px solid #242b36;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
    `
  });

  // Contenedor para controles de filtro de tiempo
  const timeRangeControls = el("div", {
    id: "time-range-controls",
    class: "time-range-controls",
    style: `
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px;
      background: #2a3f5f;
      border-radius: 6px;
      flex-wrap: wrap;
      align-items: center;
    `
  });

  // Botones rápidos de tiempo
  const quickTimeButtons = ['1h', '6h', '24h', '7d'];
  quickTimeButtons.forEach(btnValue => {
    const btn = el("button", {
      class: "btn btn-sm time-range-btn",
      style: `
        padding: 6px 12px;
        font-size: 0.85rem;
        background: ${timeRange.type === 'quick' && timeRange.value === btnValue ? '#46a0ff' : '#3a4f6f'};
        color: white;
        border: ${timeRange.type === 'quick' && timeRange.value === btnValue ? '2px solid #46a0ff' : '1px solid #4a5f7f'};
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      `,
      onclick: () => {
        timeRange.type = 'quick';
        timeRange.value = btnValue;
        saveTimeRangeToStorage();
        dirty = true;
        // Actualizar estilo de botones
        timeRangeControls.querySelectorAll('.time-range-btn').forEach(b => {
          b.style.background = '#3a4f6f';
          b.style.border = '1px solid #4a5f7f';
        });
        btn.style.background = '#46a0ff';
        btn.style.border = '2px solid #46a0ff';
        // Actualizar indicador
        updateTimeRangeIndicator();
      }
    }, btnValue === '1h' ? 'Última hora' : btnValue === '6h' ? 'Últimas 6h' : btnValue === '24h' ? 'Últimas 24h' : 'Última semana');
    timeRangeControls.appendChild(btn);
  });

  // Botón para selector personalizado
  const customBtn = el("button", {
    class: "btn btn-sm time-range-btn",
    style: `
      padding: 6px 12px;
      font-size: 0.85rem;
      background: ${timeRange.type === 'custom' ? '#46a0ff' : '#3a4f6f'};
      color: white;
      border: ${timeRange.type === 'custom' ? '2px solid #46a0ff' : '1px solid #4a5f7f'};
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    `,
    onclick: () => {
      showCustomTimeRangeDialog();
    }
  }, "📅 Personalizado");
  timeRangeControls.appendChild(customBtn);

  // Indicador de rango de tiempo actual
  const timeRangeIndicator = el("div", {
    id: "time-range-indicator",
    style: `
      margin-left: auto;
      font-size: 0.8rem;
      color: #9aa4b2;
      font-weight: 500;
    `
  });

  function updateTimeRangeIndicator() {
    const { from, to } = getCurrentTimeRange();
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const formatTime = (date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month} ${hours}:${minutes}`;
    };
    timeRangeIndicator.textContent = `${formatTime(fromDate)} - ${formatTime(toDate)}`;
  }

  timeRangeControls.appendChild(timeRangeIndicator);
  updateTimeRangeIndicator();

  // Función para mostrar diálogo de rango personalizado
  function showCustomTimeRangeDialog() {
    const dialog = el("div", {
      style: `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `
    });

    const dialogContent = el("div", {
      style: `
        background: #1a1f2e;
        border: 1px solid #46a0ff;
        border-radius: 8px;
        padding: 20px;
        min-width: 300px;
        max-width: 90vw;
      `
    }, 
      el("h3", {
        style: "color: #ffffff; margin-bottom: 15px; font-size: 1.1rem;"
      }, "Seleccionar Rango Personalizado"),
      el("div", {
        style: "display: flex; flex-direction: column; gap: 12px;"
      },
        el("div", {},
          el("label", {
            style: "display: block; color: #9aa4b2; margin-bottom: 5px; font-size: 0.85rem;"
          }, "Desde:"),
          el("input", {
            type: "datetime-local",
            id: "custom-time-from",
            style: `
              width: 100%;
              padding: 8px;
              background: #2a3f5f;
              border: 1px solid #4a5f7f;
              border-radius: 4px;
              color: #ffffff;
              font-size: 0.9rem;
            `,
            value: timeRange.from ? new Date(timeRange.from).toISOString().slice(0, 16) : new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16)
          })
        ),
        el("div", {},
          el("label", {
            style: "display: block; color: #9aa4b2; margin-bottom: 5px; font-size: 0.85rem;"
          }, "Hasta:"),
          el("input", {
            type: "datetime-local",
            id: "custom-time-to",
            style: `
              width: 100%;
              padding: 8px;
              background: #2a3f5f;
              border: 1px solid #4a5f7f;
              border-radius: 4px;
              color: #ffffff;
              font-size: 0.9rem;
            `,
            value: timeRange.to ? new Date(timeRange.to).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
          })
        ),
        el("div", {
          style: "display: flex; gap: 10px; margin-top: 10px;"
        },
          el("button", {
            class: "btn",
            style: `
              flex: 1;
              padding: 10px;
              background: #46a0ff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
            `,
            onclick: () => {
              const fromInput = document.getElementById('custom-time-from');
              const toInput = document.getElementById('custom-time-to');
              if (fromInput && toInput) {
                timeRange.type = 'custom';
                timeRange.from = new Date(fromInput.value).toISOString();
                timeRange.to = new Date(toInput.value).toISOString();
                saveTimeRangeToStorage();
                dirty = true;
                // Actualizar estilo de botones
                timeRangeControls.querySelectorAll('.time-range-btn').forEach(b => {
                  b.style.background = '#3a4f6f';
                  b.style.border = '1px solid #4a5f7f';
                });
                customBtn.style.background = '#46a0ff';
                customBtn.style.border = '2px solid #46a0ff';
                updateTimeRangeIndicator();
              }
              document.body.removeChild(dialog);
            }
          }, "Aplicar"),
          el("button", {
            class: "btn",
            style: `
              flex: 1;
              padding: 10px;
              background: #666;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            `,
            onclick: () => {
              document.body.removeChild(dialog);
            }
          }, "Cancelar")
        )
      )
    );

    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);

    // Cerrar al hacer clic fuera
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }

  const root = el("div", { class: "card" },
    el("h3", {}, title),
    timeRangeControls,
    el("div", { 
      class: "chart-container",
      style: "position: relative;"
    },
      el("canvas", { 
        width: 900, 
        height: 300, 
        style: "max-width:100%;height:auto;border:1px solid #242b36;border-radius:8px;background:#1a1f2e;cursor: crosshair;" 
      })
    ),
    legendContainer
  );

  if (showStats) {
    const statsContainer = el("div", { 
      class: "stats-container",
      style: "display:flex;gap:1rem;margin-top:1rem;flex-wrap:wrap;"
    });
    root.appendChild(statsContainer);
  }

  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const statsContainer = root.querySelector(".stats-container");
  
  // Crear tooltip para mostrar información al hacer hover
  const tooltip = el("div", {
    id: "chart-tooltip",
    style: `
      position: absolute;
      background: rgba(26, 31, 46, 0.95);
      border: 1px solid #46a0ff;
      border-radius: 6px;
      padding: 8px 12px;
      color: #ffffff;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 180px;
    `
  });
  root.appendChild(tooltip);
  
  // Variables para tracking de hover
  let hoveredPoint = null;
  const HOVER_THRESHOLD = 8; // Distancia en píxeles para detectar hover sobre un punto

  // seriesMap mantiene series independientes por línea:
  // key: `${sensorId}:temp` o `${sensorId}:hum`
  // value: Array<{ timestamp: string, value: number }>
  const seriesMap = new Map();
  const sensorIds = new Set();
  let dirty = false;
  let lastRenderTime = 0; // Para throttling de renderizado según chartRefreshInterval

  // Sistema de filtro de tiempo tipo Grafana
  const timeRangeStorageKey = `chart_time_range_${deviceId || 'global'}_${deviceType || 'all'}`;
  let timeRange = {
    type: 'quick', // 'quick' o 'custom'
    value: '1h', // '1h', '6h', '24h', '7d' para quick, o { from, to } para custom
    from: null, // Timestamp para rango personalizado
    to: null // Timestamp para rango personalizado
  };

  // Función para cargar rango de tiempo desde localStorage
  function loadTimeRangeFromStorage() {
    try {
      const saved = localStorage.getItem(timeRangeStorageKey);
      if (saved) {
        const savedRange = JSON.parse(saved);
        timeRange = { ...timeRange, ...savedRange };
      }
    } catch (error) {
      console.warn('[Chart] Error cargando rango de tiempo desde localStorage:', error);
    }
  }

  // Función para guardar rango de tiempo en localStorage
  function saveTimeRangeToStorage() {
    try {
      localStorage.setItem(timeRangeStorageKey, JSON.stringify(timeRange));
    } catch (error) {
      console.warn('[Chart] Error guardando rango de tiempo en localStorage:', error);
    }
  }

  // Función para calcular el rango de tiempo actual
  function getCurrentTimeRange() {
    const now = Date.now();
    let from, to = now;

    if (timeRange.type === 'quick') {
      const hours = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168 // 7 días = 168 horas
      };
      const hoursBack = hours[timeRange.value] || 1;
      from = now - (hoursBack * 60 * 60 * 1000);
    } else if (timeRange.type === 'custom') {
      from = timeRange.from ? new Date(timeRange.from).getTime() : now - (60 * 60 * 1000);
      to = timeRange.to ? new Date(timeRange.to).getTime() : now;
    } else {
      // Fallback a 1 hora
      from = now - (60 * 60 * 1000);
    }

    return { from, to };
  }

  // Cargar rango de tiempo al inicializar
  loadTimeRangeFromStorage();
  
  // Sistema de filtros: Map de series visibles/ocultas
  // key: `${sensorId}:temp` o `${sensorId}:hum`, value: boolean (true = visible)
  const seriesVisibility = new Map();
  
  // Clave para localStorage (única por gráfico)
  const storageKey = `chart_filters_${deviceId || 'global'}_${deviceType || 'all'}`;
  
  // Función para cargar filtros desde localStorage
  function loadFiltersFromStorage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedFilters = JSON.parse(saved);
        Object.entries(savedFilters).forEach(([key, visible]) => {
          seriesVisibility.set(key, visible);
        });
      }
    } catch (error) {
      console.warn('[Chart] Error cargando filtros desde localStorage:', error);
    }
  }
  
  // Función para guardar filtros en localStorage
  function saveFiltersToStorage() {
    try {
      const filtersObj = Object.fromEntries(seriesVisibility);
      localStorage.setItem(storageKey, JSON.stringify(filtersObj));
    } catch (error) {
      console.warn('[Chart] Error guardando filtros en localStorage:', error);
    }
  }
  
  // Función para inicializar visibilidad (todas visibles por defecto o desde storage)
  function initializeVisibility() {
    // Cargar desde storage primero
    loadFiltersFromStorage();
    
    seriesMap.forEach((arr, key) => {
      if (!seriesVisibility.has(key)) {
        seriesVisibility.set(key, true); // Por defecto todas visibles
      }
    });
  }
  
  // Función para togglear visibilidad de una serie
  function toggleSeriesVisibility(key) {
    const current = seriesVisibility.get(key) !== false; // true por defecto
    seriesVisibility.set(key, !current);
    saveFiltersToStorage(); // Guardar en localStorage
    dirty = true; // Forzar re-render
  }
  
  // Función para verificar si una serie es visible
  function isSeriesVisible(key) {
    return seriesVisibility.get(key) !== false; // true por defecto
  }

  // Paleta de colores para líneas (rotación determinística por clave)
  const COLORS = [
    "#46a0ff", "#4CAF50", "#FF5722", "#9C27B0", "#FFC107",
    "#00BCD4", "#E91E63", "#8BC34A", "#FF9800", "#3F51B5"
  ];

  function colorForKey(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % COLORS.length;
    return COLORS[idx];
  }

  // Función para convertir temperatura según unidad configurada
  function convertTemperature(temp, fromUnit, toUnit) {
    if (fromUnit === toUnit) return temp;
    if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
      return (temp * 9/5) + 32;
    }
    if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
      return (temp - 32) * 5/9;
    }
    return temp;
  }

  // Función para formatear temperatura con unidad
  function formatTemperature(temp) {
    const converted = convertTemperature(temp, 'celsius', temperatureUnit);
    const symbol = temperatureUnit === 'fahrenheit' ? '°F' : '°C';
    return converted.toFixed(1) + symbol;
  }

  function pushPoint(point) {
    // Extraer sensor_id de diferentes formatos posibles
    const sid = point.sensor_id || point.id || point.payload?.id || "unknown";
    
    // Filtrar por dispositivo seleccionado
    if (deviceId) {
      if (deviceType === 'sensor') {
        // Si es un sensor, solo mostrar datos de ese sensor específico
        if (sid !== deviceId && point.id !== deviceId && point.sensor_id !== deviceId) {
          return; // Ignorar datos de otros sensores
        }
      } else if (deviceType === 'endpoint') {
        // Si es un endpoint, solo mostrar datos de sus sensores asociados
        if (endpointSensorIds.length > 0) {
          // Verificar si el sensor_id está en la lista de sensores del endpoint
          if (!endpointSensorIds.includes(sid) && 
              !endpointSensorIds.includes(point.id) && 
              !endpointSensorIds.includes(point.sensor_id)) {
            return; // Ignorar sensores que no pertenecen al endpoint
          }
        }
        // También verificar si el punto tiene endpoint_id y coincide
        if (point.endpoint_id && point.endpoint_id !== deviceId) {
          return;
        }
      }
    }
    
    sensorIds.add(sid);
    
    // Inicializar visibilidad si es la primera vez que vemos esta serie
    initializeVisibility();
    
    // Extraer temperatura (soporta diferentes formatos: temperature, temp, temperatura)
    const tempValue = point.temperature !== undefined ? point.temperature : 
                     point.temp !== undefined ? point.temp : 
                     point.payload?.temperatura !== undefined ? point.payload.temperatura :
                     point.temperatura !== undefined ? point.temperatura : null;
    
    if (typeof tempValue === "number" && !isNaN(tempValue)) {
      const keyT = `${sid}:temp`;
      if (!seriesMap.has(keyT)) seriesMap.set(keyT, []);
      const arrT = seriesMap.get(keyT);
      if (arrT.length >= finalMaxPoints) arrT.shift();
      arrT.push({ 
        timestamp: point.timestamp || point.payload?.timestamp || new Date().toISOString(), 
        value: tempValue 
      });
      
      // Verificar alertas de temperatura
      if (window.alertService) {
        try {
          alertService.checkTemperature(tempValue, {
            sensorId: sid,
            deviceId: deviceId,
            deviceType: deviceType,
            endpointId: point.endpoint_id,
            id: sid,
            sensor_id: sid
          });
        } catch (error) {
          console.warn('[Chart] Error verificando alerta de temperatura:', error);
        }
      }
    }
    
    // Extraer humedad (soporta diferentes formatos: humidity, humedad, hum)
    const humValue = point.humidity !== undefined ? point.humidity : 
                    point.humedad !== undefined ? point.humedad :
                    point.payload?.humedad !== undefined ? point.payload.humedad :
                    point.hum !== undefined ? point.hum : null;
    
    if (typeof humValue === "number" && !isNaN(humValue)) {
      const keyH = `${sid}:hum`;
      if (!seriesMap.has(keyH)) seriesMap.set(keyH, []);
      const arrH = seriesMap.get(keyH);
      if (arrH.length >= finalMaxPoints) arrH.shift();
      arrH.push({ 
        timestamp: point.timestamp || point.payload?.timestamp || new Date().toISOString(), 
        value: humValue 
      });
      
      // Verificar alertas de humedad
      if (window.alertService) {
        try {
          alertService.checkHumidity(humValue, {
            sensorId: sid,
            deviceId: deviceId,
            deviceType: deviceType,
            endpointId: point.endpoint_id,
            id: sid,
            sensor_id: sid
          });
        } catch (error) {
          console.warn('[Chart] Error verificando alerta de humedad:', error);
        }
      }
    }
    
    // Marcar como dirty pero solo actualizar stats inmediatamente
    // El renderizado se throttlerá según chartRefreshInterval
    dirty = true;
    updateStats();
    
    // Actualizar leyenda si hay nuevos sensores
    if (sensorIds.size > 0) {
      renderLegend();
    }
  }

  function updateStats() {
    if (!statsContainer) return;
    const sensors = Array.from(sensorIds);
    if (sensors.length === 0) return;
    const items = sensors.map(sid => {
      const keyT = `${sid}:temp`;
      const keyH = `${sid}:hum`;
      const tArr = seriesMap.get(keyT) || [];
      const hArr = seriesMap.get(keyH) || [];
      const latestT = tArr.length ? tArr[tArr.length - 1].value : null;
      const latestH = hArr.length ? hArr[hArr.length - 1].value : null;
      const colorT = colorForKey(keyT);
      const colorH = colorForKey(keyH);
      const visibleT = isSeriesVisible(keyT);
      const visibleH = isSeriesVisible(keyH);
      return `
        <div class="stat-item" style="background:#2a3f5f;padding:0.5rem;border-radius:4px;min-width:120px;opacity:${visibleT || visibleH ? 1 : 0.5};">
          <div style="font-size:0.75rem;color:#9aa4b2;">Sensor ${sid}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colorT};opacity:${visibleT ? 1 : 0.3};"></span>
            <span style="font-size:1rem;font-weight:bold;color:${colorT};opacity:${visibleT ? 1 : 0.5};">${latestT !== null ? formatTemperature(latestT) : '—'}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
            <span style="display:inline-block;width:8px;height:2px;background:${colorH};opacity:${visibleH ? 1 : 0.3};"></span>
            <span style="font-size:0.95rem;font-weight:bold;color:${colorH};opacity:${visibleH ? 1 : 0.5};">${latestH !== null ? `${latestH.toFixed(1)}%` : '—'}</span>
          </div>
        </div>`;
    }).join("");
    statsContainer.innerHTML = items;
  }

  function draw() {
    if (!dirty && !hoveredPoint) return;
    if (!hoveredPoint) dirty = false;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Fondo con grid sutil
    ctx.strokeStyle = "#2b3341";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (H - 40) * (i / 4) + 20;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(W - 20, y);
      ctx.stroke();
    }

    // Determinar cantidad total de puntos (máximo de cualquier serie)
    const allSeries = Array.from(seriesMap.values());
    const totalPoints = allSeries.reduce((m, arr) => Math.max(m, arr.length), 0);
    if (totalPoints < 2) {
      // Mostrar mensaje de espera
      ctx.fillStyle = "#9aa4b2";
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Esperando datos de temperatura...", W / 2, H / 2);
      ctx.textAlign = "left";
      return;
    }

    // Escala de temperatura (solo series visibles de temp)
    const tempValues = [];
    seriesMap.forEach((arr, key) => {
      if (key.endsWith(":temp") && isSeriesVisible(key)) {
        arr.forEach(p => { if (!isNaN(p.value)) tempValues.push(p.value); });
      }
    });
    const tMin = tempValues.length ? Math.min(...tempValues) : 0;
    const tMax = tempValues.length ? Math.max(...tempValues) : 1;
    const tPad = (tMax - tMin) * 0.1 || 5;
    const tYMin = Math.floor(tMin - tPad);
    const tYMax = Math.ceil(tMax + tPad);

    // Escala de humedad (solo series visibles de hum)
    const humValues = [];
    seriesMap.forEach((arr, key) => {
      if (key.endsWith(":hum") && isSeriesVisible(key)) {
        arr.forEach(p => { if (!isNaN(p.value)) humValues.push(p.value); });
      }
    });
    const hMin = humValues.length ? Math.min(...humValues) : 0;
    const hMax = humValues.length ? Math.max(...humValues) : 100;
    const hPad = (hMax - hMin) * 0.1 || 5;
    const hYMin = Math.floor(hMin - hPad);
    const hYMax = Math.ceil(hMax + hPad);

    // Calcular escala de tiempo para el eje X usando el rango seleccionado
    const { from: timeFrom, to: timeTo } = getCurrentTimeRange();
    
    // Filtrar y obtener todos los timestamps dentro del rango seleccionado
    const allTimestamps = [];
    seriesMap.forEach((arr) => {
      arr.forEach(p => {
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts >= timeFrom && ts <= timeTo) {
            allTimestamps.push(ts);
          }
        }
      });
    });
    
    // Usar el rango seleccionado, pero ajustar si hay datos fuera del rango visible
    const minTime = allTimestamps.length > 0 ? Math.min(...allTimestamps) : timeFrom;
    const maxTime = allTimestamps.length > 0 ? Math.max(...allTimestamps) : timeTo;
    const timeRangeMs = maxTime - minTime || (timeTo - timeFrom) || (60 * 60 * 1000); // Fallback a 1 hora si no hay datos
    
    // Función para calcular posición X basada en timestamp (filtrado por rango)
    const getXFromTimestamp = (timestamp) => {
      if (!timestamp) return 20; // Fallback a inicio
      const ts = new Date(timestamp).getTime();
      // Filtrar puntos fuera del rango seleccionado
      if (ts < timeFrom || ts > timeTo) {
        return -1; // Retornar -1 para indicar que está fuera del rango
      }
      const normalizedTime = Math.max(0, Math.min(1, (ts - minTime) / timeRangeMs));
      return 20 + normalizedTime * (W - 40);
    };
    
    // Función para calcular posición X basada en índice (fallback)
    const getXFromIndex = (i, totalPoints) => {
      if (totalPoints < 2) return 20;
      return 20 + (i / (totalPoints - 1)) * (W - 40);
    };

    // Dibujar todas las líneas de temperatura (una por sensor) - solo si están visibles y dentro del rango
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":temp")) return;
      if (!isSeriesVisible(key)) return; // Saltar si está oculta
      const color = colorForKey(key);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      let firstPoint = true;
      arr.forEach((p, i) => {
        // Filtrar puntos fuera del rango de tiempo seleccionado
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts < timeFrom || ts > timeTo) return; // Saltar puntos fuera del rango
        }
        // Usar timestamp si está disponible, sino usar índice
        const x = p.timestamp ? getXFromTimestamp(p.timestamp) : getXFromIndex(i, arr.length);
        if (x < 0) return; // Saltar si está fuera del rango (getXFromTimestamp retorna -1)
        const y = H - 20 - ((p.value - tYMin) / (tYMax - tYMin)) * (H - 40);
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      if (!firstPoint) ctx.stroke(); // Solo dibujar si hay al menos un punto
    });

    // Puntos (temperatura) - dibujar más grandes si están hovered - solo si están visibles y dentro del rango
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":temp")) return;
      if (!isSeriesVisible(key)) return; // Saltar si está oculta
      const color = colorForKey(key);
      ctx.fillStyle = color;
      arr.forEach((p, i) => {
        // Filtrar puntos fuera del rango de tiempo seleccionado
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts < timeFrom || ts > timeTo) return; // Saltar puntos fuera del rango
        }
        // Usar timestamp si está disponible, sino usar índice
        const x = p.timestamp ? getXFromTimestamp(p.timestamp) : getXFromIndex(i, arr.length);
        if (x < 0) return; // Saltar si está fuera del rango
        const y = H - 20 - ((p.value - tYMin) / (tYMax - tYMin)) * (H - 40);
        ctx.beginPath();
        // Hacer el punto más grande si está siendo hovered
        const isHovered = hoveredPoint && hoveredPoint.key === key && hoveredPoint.index === i;
        ctx.arc(x, y, isHovered ? 5 : 2, 0, 2 * Math.PI);
        ctx.fill();
        // Dibujar círculo exterior si está hovered
        if (isHovered) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });
    });

    // Etiquetas de escala temperatura (izquierda)
    ctx.fillStyle = "#9aa4b2";
    ctx.font = "12px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${formatTemperature(tYMin)}`, 5, H - 15);
    ctx.fillText(`${formatTemperature(tYMax)}`, 5, 25);

    // Eje X con timestamps usando el rango seleccionado
    ctx.fillStyle = "#9aa4b2";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    
    // Obtener todos los timestamps de todas las series visibles dentro del rango
    const allTimestampsForAxis = [];
    seriesMap.forEach((arr, key) => {
      if (isSeriesVisible(key)) {
        arr.forEach(p => {
          if (p.timestamp) {
            const ts = new Date(p.timestamp).getTime();
            if (ts >= timeFrom && ts <= timeTo) {
              allTimestampsForAxis.push(ts);
            }
          }
        });
      }
    });
    
    // Si no hay timestamps, usar el rango seleccionado directamente
    if (allTimestampsForAxis.length === 0) {
      // Dibujar etiquetas de tiempo basadas en el rango seleccionado
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i / 5) * (W - 40);
        const timeValue = minTime + (i / 5) * timeRangeMs;
        const timeDate = new Date(timeValue);
        
        // Formatear tiempo: HH:MM o DD/MM HH:MM si es más de 24h
        const hours = timeDate.getHours().toString().padStart(2, '0');
        const minutes = timeDate.getMinutes().toString().padStart(2, '0');
        const day = timeDate.getDate();
        const month = timeDate.getMonth() + 1;
        const timeLabel = timeRangeMs > 24 * 60 * 60 * 1000 
          ? `${day}/${month} ${hours}:${minutes}` 
          : `${hours}:${minutes}`;
        
        ctx.fillText(timeLabel, x, H - 5);
        
        // Dibujar línea vertical sutil para guía
        ctx.strokeStyle = "#2b3341";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, H - 20);
        ctx.stroke();
      }
    } else {
      // Usar timestamps reales del rango seleccionado
      const minTimeAxis = Math.min(...allTimestampsForAxis);
      const maxTimeAxis = Math.max(...allTimestampsForAxis);
      const timeRangeAxis = maxTimeAxis - minTimeAxis || 1; // Evitar división por cero
      
      // Dibujar 6 etiquetas de tiempo equiespaciadas
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i / 5) * (W - 40);
        const timeValue = minTimeAxis + (i / 5) * timeRangeAxis;
        const timeDate = new Date(timeValue);
        
        // Formatear tiempo según la duración del rango
        const hours = timeDate.getHours().toString().padStart(2, '0');
        const minutes = timeDate.getMinutes().toString().padStart(2, '0');
        const day = timeDate.getDate();
        const month = timeDate.getMonth() + 1;
        const timeLabel = timeRangeMs > 24 * 60 * 60 * 1000 
          ? `${day}/${month} ${hours}:${minutes}` 
          : `${hours}:${minutes}`;
        
        ctx.fillText(timeLabel, x, H - 5);
        
        // Dibujar línea vertical sutil para guía
        ctx.strokeStyle = "#2b3341";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, H - 20);
        ctx.stroke();
      }
    }
    
    ctx.textAlign = "left";

    // Dibujar todas las líneas de humedad (una por sensor) - con línea discontinua - solo si están visibles y dentro del rango
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":hum")) return;
      if (!isSeriesVisible(key)) return; // Saltar si está oculta
      const color = colorForKey(key);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      let firstPoint = true;
      arr.forEach((p, i) => {
        // Filtrar puntos fuera del rango de tiempo seleccionado
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts < timeFrom || ts > timeTo) return; // Saltar puntos fuera del rango
        }
        // Usar timestamp si está disponible, sino usar índice
        const x = p.timestamp ? getXFromTimestamp(p.timestamp) : getXFromIndex(i, arr.length);
        if (x < 0) return; // Saltar si está fuera del rango
        const y = H - 20 - ((p.value - hYMin) / (hYMax - hYMin)) * (H - 40);
        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      if (!firstPoint) ctx.stroke(); // Solo dibujar si hay al menos un punto
      ctx.setLineDash([]);
    });
    
    // Puntos (humedad) - dibujar más grandes si están hovered - solo si están visibles y dentro del rango
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":hum")) return;
      if (!isSeriesVisible(key)) return; // Saltar si está oculta
      const color = colorForKey(key);
      ctx.fillStyle = color;
      arr.forEach((p, i) => {
        // Filtrar puntos fuera del rango de tiempo seleccionado
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts < timeFrom || ts > timeTo) return; // Saltar puntos fuera del rango
        }
        // Usar timestamp si está disponible, sino usar índice
        const x = p.timestamp ? getXFromTimestamp(p.timestamp) : getXFromIndex(i, arr.length);
        if (x < 0) return; // Saltar si está fuera del rango
        const y = H - 20 - ((p.value - hYMin) / (hYMax - hYMin)) * (H - 40);
        ctx.beginPath();
        // Hacer el punto más grande si está siendo hovered
        const isHovered = hoveredPoint && hoveredPoint.key === key && hoveredPoint.index === i;
        ctx.arc(x, y, isHovered ? 5 : 2, 0, 2 * Math.PI);
        ctx.fill();
        // Dibujar círculo exterior si está hovered
        if (isHovered) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.stroke();
        }
      });
    });

    // Eje derecho para humedad (valores extremos)
    ctx.fillStyle = "#9aa4b2";
    ctx.font = "12px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`${hYMin}%`, W - 5, H - 15);
    ctx.fillText(`${hYMax}%`, W - 5, 25);

    // Leyenda (ahora se renderiza en HTML, no en canvas)
    // La leyenda interactiva se maneja más abajo en el código
    
    // Si hay un punto hovered, dibujar línea vertical de referencia
    if (hoveredPoint) {
      const arr = seriesMap.get(hoveredPoint.key) || [];
      if (arr.length > 0 && hoveredPoint.index < arr.length) {
        const p = arr[hoveredPoint.index];
        // Usar timestamp si está disponible, sino usar índice
        const x = p.timestamp ? getXFromTimestamp(p.timestamp) : getXFromIndex(hoveredPoint.index, arr.length);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, H - 20);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
  
  // Función para encontrar el punto más cercano al mouse
  function findClosestPoint(mouseX, mouseY) {
    const W = canvas.width, H = canvas.height;
    const tempValues = [];
    seriesMap.forEach((arr, key) => {
      if (key.endsWith(":temp")) arr.forEach(p => { if (!isNaN(p.value)) tempValues.push(p.value); });
    });
    const tMin = tempValues.length ? Math.min(...tempValues) : 0;
    const tMax = tempValues.length ? Math.max(...tempValues) : 1;
    const tPad = (tMax - tMin) * 0.1 || 5;
    const tYMin = Math.floor(tMin - tPad);
    const tYMax = Math.ceil(tMax + tPad);
    
    const humValues = [];
    seriesMap.forEach((arr, key) => {
      if (key.endsWith(":hum")) arr.forEach(p => { if (!isNaN(p.value)) humValues.push(p.value); });
    });
    const hMin = humValues.length ? Math.min(...humValues) : 0;
    const hMax = humValues.length ? Math.max(...humValues) : 100;
    const hPad = (hMax - hMin) * 0.1 || 5;
    const hYMin = Math.floor(hMin - hPad);
    const hYMax = Math.ceil(hMax + hPad);
    
    let closestPoint = null;
    let minDistance = HOVER_THRESHOLD;
    
    // Calcular escala de tiempo para hover usando el rango seleccionado
    const { from: timeFromForHover, to: timeToForHover } = getCurrentTimeRange();
    const allTimestampsForHover = [];
    seriesMap.forEach((arr) => {
      arr.forEach(p => {
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts >= timeFromForHover && ts <= timeToForHover) {
            allTimestampsForHover.push(ts);
          }
        }
      });
    });
    const minTimeForHover = allTimestampsForHover.length > 0 ? Math.min(...allTimestampsForHover) : timeFromForHover;
    const maxTimeForHover = allTimestampsForHover.length > 0 ? Math.max(...allTimestampsForHover) : timeToForHover;
    const timeRangeForHover = maxTimeForHover - minTimeForHover || (timeToForHover - timeFromForHover) || (60 * 60 * 1000);
    
    const getXFromTimestampForHover = (timestamp) => {
      if (!timestamp) return 20;
      const ts = new Date(timestamp).getTime();
      // Filtrar puntos fuera del rango seleccionado
      if (ts < timeFromForHover || ts > timeToForHover) {
        return -1; // Retornar -1 para indicar que está fuera del rango
      }
      const normalizedTime = Math.max(0, Math.min(1, (ts - minTimeForHover) / timeRangeForHover));
      return 20 + normalizedTime * (W - 40);
    };
    
    const getXFromIndexForHover = (i, totalPoints) => {
      if (totalPoints < 2) return 20;
      return 20 + (i / (totalPoints - 1)) * (W - 40);
    };
    
    // Buscar en todas las series (temperatura y humedad) - solo dentro del rango seleccionado
    seriesMap.forEach((arr, key) => {
      arr.forEach((p, i) => {
        // Filtrar puntos fuera del rango de tiempo seleccionado
        if (p.timestamp) {
          const ts = new Date(p.timestamp).getTime();
          if (ts < timeFromForHover || ts > timeToForHover) return; // Saltar puntos fuera del rango
        }
        
        // Usar timestamp si está disponible, sino usar índice
        const x = p.timestamp ? getXFromTimestampForHover(p.timestamp) : getXFromIndexForHover(i, arr.length);
        if (x < 0) return; // Saltar si está fuera del rango
        
        let y;
        if (key.endsWith(":temp")) {
          y = H - 20 - ((p.value - tYMin) / (tYMax - tYMin)) * (H - 40);
        } else if (key.endsWith(":hum")) {
          y = H - 20 - ((p.value - hYMin) / (hYMax - hYMin)) * (H - 40);
        } else {
          return;
        }
        
        const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
        if (distance < minDistance) {
          minDistance = distance;
          const sensorId = key.split(":")[0];
          const type = key.endsWith(":temp") ? "temperatura" : "humedad";
          closestPoint = {
            key,
            index: i,
            point: p,
            sensorId,
            type,
            x,
            y,
            value: p.value,
            timestamp: p.timestamp
          };
        }
      });
    });
    
    return closestPoint;
  }
  
  // Función para actualizar el tooltip
  function updateTooltip(point, mouseX, mouseY) {
    if (!point) {
      tooltip.style.display = "none";
      return;
    }
    
    const sensorId = point.sensorId;
    const type = point.type;
    const value = point.value;
    const timestamp = point.timestamp ? new Date(point.timestamp).toLocaleString() : "N/A";
    
    let displayValue;
    if (type === "temperatura") {
      displayValue = formatTemperature(value);
    } else {
      displayValue = `${value.toFixed(1)}%`;
    }
    
    const typeLabel = type === "temperatura" ? "🌡️ Temperatura" : "💧 Humedad";
    const typeColor = type === "temperatura" ? "#46a0ff" : "#4CAF50";
    
    tooltip.innerHTML = `
      <div style="margin-bottom: 4px; font-weight: 600; color: ${typeColor};">
        ${typeLabel}
      </div>
      <div style="margin-bottom: 4px;">
        <strong>Sensor:</strong> ${sensorId}
      </div>
      <div style="margin-bottom: 4px;">
        <strong>Valor:</strong> ${displayValue}
      </div>
      <div style="font-size: 10px; color: #9aa4b2; margin-top: 6px;">
        📅 ${timestamp}
      </div>
    `;
    
    // Posicionar el tooltip cerca del cursor
    const tooltipWidth = 200;
    const tooltipHeight = 120;
    const offsetX = 15;
    const offsetY = -60;
    
    let left = mouseX + offsetX;
    let top = mouseY + offsetY;
    
    // Ajustar si el tooltip sale del canvas
    if (left + tooltipWidth > canvas.offsetWidth) {
      left = mouseX - tooltipWidth - offsetX;
    }
    if (top + tooltipHeight > canvas.offsetHeight) {
      top = mouseY - tooltipHeight - offsetY;
    }
    
    tooltip.style.display = "block";
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  // Event listeners para hover en el canvas
  const chartContainer = root.querySelector(".chart-container");
  const getCanvasMousePos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  
  const getContainerMousePos = (e) => {
    const rect = chartContainer.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };
  
  canvas.addEventListener("mousemove", (e) => {
    const mousePos = getCanvasMousePos(e);
    const containerPos = getContainerMousePos(e);
    const closestPoint = findClosestPoint(mousePos.x, mousePos.y);
    
    if (closestPoint) {
      hoveredPoint = closestPoint;
      updateTooltip(closestPoint, containerPos.x, containerPos.y);
      dirty = true; // Forzar re-render para mostrar el punto destacado
    } else {
      if (hoveredPoint) {
        hoveredPoint = null;
        updateTooltip(null, 0, 0);
        dirty = true; // Forzar re-render para quitar el punto destacado
      }
    }
  });
  
  canvas.addEventListener("mouseleave", () => {
    hoveredPoint = null;
    updateTooltip(null, 0, 0);
    dirty = true;
  });
  
  // RAF loop con throttling según chartRefreshInterval
  function loop() {
    const currentLoopTime = Date.now();
    // Solo renderizar si ha pasado el intervalo mínimo configurado o hay hover activo
    if ((dirty && (currentLoopTime - lastRenderTime >= chartRefreshInterval)) || hoveredPoint) {
      draw();
      if (!hoveredPoint) lastRenderTime = currentLoopTime;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  
  // Listener para cambios en la configuración de visualización
  let configUnsubscribe = null;
  try {
    configUnsubscribe = configService.onConfigChange('visualization_config', (newConfig) => {
      if (newConfig) {
        // Actualizar chartRefresh si cambió
        if (newConfig.chartRefresh) {
          const newInterval = Math.max(newConfig.chartRefresh, 15000);
          if (newInterval !== chartRefreshInterval) {
            console.log(`[TemperatureChart] Actualizando intervalo de renderizado: ${chartRefreshInterval}ms → ${newInterval}ms`);
            chartRefreshInterval = newInterval;
            lastRenderTime = 0; // Permitir renderizado inmediato
            dirty = true;
          }
        }
        
        // Actualizar maxPoints si cambió
        if (newConfig.chartPoints && newConfig.chartPoints !== finalMaxPoints) {
          console.log(`[TemperatureChart] Actualizando límite de puntos: ${finalMaxPoints} → ${newConfig.chartPoints}`);
          // Limitar series existentes al nuevo máximo
          seriesMap.forEach((arr, key) => {
            if (arr.length > newConfig.chartPoints) {
              const excess = arr.length - newConfig.chartPoints;
              arr.splice(0, excess);
            }
          });
          dirty = true;
        }
        
        // Actualizar unidad de temperatura si cambió
        if (newConfig.temperatureUnit && newConfig.temperatureUnit !== temperatureUnit) {
          console.log(`[TemperatureChart] Actualizando unidad de temperatura: ${temperatureUnit} → ${newConfig.temperatureUnit}`);
          dirty = true; // Forzar re-render para actualizar etiquetas
        }
      }
    });
  } catch (error) {
    console.warn('[TemperatureChart] Error suscribiéndose a cambios de configuración:', error);
  }

  // Suscripción a datos de temperatura desde MQTT
  let unsubscribe = null;
  let currentTopic = null;
  
  const setupTopicSubscription = async () => {
    try {
      // Obtener tópicos de temperatura disponibles
      const temperatureTopics = mqttTopicsService.getTemperatureTopics();
      
      // Determinar qué tópico usar
      if (topicName) {
        // Usar tópico específico si se proporciona
        currentTopic = topicName;
      } else if (temperatureTopics.length > 0) {
        // Usar el primer tópico de temperatura disponible
        currentTopic = temperatureTopics[0].nombre;
      } else {
        // Fallback al tópico por defecto
        currentTopic = "temperature";
      }
      
      console.log(`[WS] Suscribiendose a topico de temperatura: ${currentTopic}`);
      
      // Suscribirse a múltiples tópicos para recibir datos de sensores
      const unsubscribers = [];

      // Suscribirse al tópico de temperatura general
      unsubscribers.push(rtClient.subscribe("temperature", (msg) => {
        if (msg.payload) {
          // El payload ya viene con el formato correcto: { sensor_id, temperature, humidity, timestamp, ... }
          pushPoint({
            ...msg.payload,
            timestamp: msg.payload.timestamp || new Date(msg.ts || Date.now()).toISOString()
          });
        }
      }));

      // Suscribirse al tópico de actualizaciones de sensores
      unsubscribers.push(rtClient.subscribe("sensor_update", (msg) => {
        if (msg.payload) {
          const sensorData = msg.payload;
          pushPoint({
            timestamp: sensorData.timestamp || new Date(msg.ts || Date.now()).toISOString(),
            sensor_id: sensorData.id,
            id: sensorData.id, // También como 'id' para compatibilidad
            temperature: sensorData.temperatura, // formato español
            temp: sensorData.temperatura, // alias
            temperatura: sensorData.temperatura, // formato directo
            humidity: sensorData.humedad, // formato inglés
            humedad: sensorData.humedad, // formato español
            endpoint_id: sensorData.endpoint_id,
            raw_data: sensorData
          });
        }
      }));

      // Función para desuscribirse de todos los tópicos
      unsubscribe = () => {
        unsubscribers.forEach(unsub => {
          if (typeof unsub === 'function') unsub();
        });
      };
      
      // Actualizar título con el tópico usado
      const titleElement = root.querySelector("h3");
      if (titleElement) {
        titleElement.textContent = `${title} (${currentTopic})`;
      }
      
    } catch (error) {
      console.error("Error configurando suscripción a tópico:", error);
      // Fallback a suscripción básica
      unsubscribe = rtClient.subscribe("temperature", (msg) => {
        if (msg.type === "temperature_update" && msg.data) {
          pushPoint(msg.data);
        }
      });
    }
  };
  
  // Configurar suscripción
  await setupTopicSubscription();
  
  // Renderizar leyenda inicial
  renderLegend();
  
  // Actualizar leyenda cuando cambien las series
  const legendUpdateInterval = setInterval(() => {
    if (sensorIds.size > 0) {
      renderLegend();
    }
  }, 2000); // Actualizar cada 2 segundos

  // Cargar datos históricos iniciales
  try {
    const response = await fetch(`${window.__CONFIG?.API_URL || '/api'}/temperature?limit=${finalMaxPoints}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        result.data.forEach(point => pushPoint(point));
      }
    }
  } catch (error) {
    console.warn("No se pudieron cargar datos históricos:", error);
  }

  // Limpieza cuando el componente se remueve
  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      if (unsubscribe) unsubscribe();
      if (configUnsubscribe) configUnsubscribe();
      if (legendUpdateInterval) clearInterval(legendUpdateInterval);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return root;
}
