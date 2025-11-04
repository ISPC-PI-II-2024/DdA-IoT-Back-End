// ==========================
// Página de Vista General de Dispositivos
// Muestra la estructura jerárquica: Gateway -> Endpoints -> Sensores
// Solo datos de la DB, sin MQTT
// ==========================
import { el } from "../utils/dom.js";
import { setDevices } from "../state/store.js";
import { DevicesAPI, GatewayAPI } from "../api.js";

export async function render() {
  let lastUpdate = null;
  let devicesData = null;
  
  // Función para cargar dispositivos de la DB
  async function loadDevicesFromDB() {
    try {
      const response = await DevicesAPI.getAllDevices();
      if (response.success && Array.isArray(response.data)) {
        devicesData = response.data;
        lastUpdate = new Date();
        return devicesData;
      } else {
        console.warn('No se pudieron cargar los dispositivos:', response);
        return [];
      }
    } catch (error) {
      console.error('Error cargando dispositivos:', error);
      return [];
    }
  }

  // Fallback: cargar dispositivos desde el estado del sistema (MQTT) si DB está vacía
  async function loadDevicesFromSystemStatus() {
    try {
      const response = await GatewayAPI.getSystemStatus();
      if (response && response.success && response.data) {
        const { gateways = [], endpoints = [], sensors = [] } = response.data;
        const devices = [];
        gateways.forEach(g => devices.push({
          id: g.id,
          id_dispositivo: g.id,
          nombre: `Gateway ${g.id}`,
          tipo: 'gateway',
          ubicacion: g.ubicacion || null,
          estado: g.lora_status === 'ok' ? 'en_linea' : 'fuera_linea',
          id_gateway: g.id,
          id_endpoint: null
        }));
        endpoints.forEach(e => devices.push({
          id: e.id,
          id_dispositivo: e.id,
          nombre: `Endpoint ${e.id}`,
          tipo: 'endpoint',
          ubicacion: null,
          estado: e.status === 'ok' ? 'en_linea' : (e.status === 'battery_low' ? 'error' : 'fuera_linea'),
          id_gateway: e.gateway_id,
          id_endpoint: null
        }));
        sensors.forEach(s => devices.push({
          id: s.id,
          id_dispositivo: s.id,
          nombre: `Sensor ${s.id}`,
          tipo: 'sensor',
          ubicacion: null,
          estado: s.status === 'ok' ? 'en_linea' : 'error',
          id_gateway: s.gateway_id,
          id_endpoint: s.endpoint_id
        }));
        return devices;
      }
    } catch (e) {
      console.warn('[DISPOSITIVOS] Fallback system status error:', e);
    }
    return [];
  }

  // Sistema de batching para consultas de histórico
  const historyBatchQueue = new Map(); // deviceId -> {resolve, reject, containerNode}
  let historyBatchTimer = null;
  const HISTORY_BATCH_DELAY = 500; // 500ms para agrupar consultas
  const HISTORY_BATCH_SIZE = 5; // Máximo 5 dispositivos por batch
  
  // Función para procesar batch de históricos
  async function processHistoryBatch() {
    if (historyBatchQueue.size === 0) return;
    
    const devicesToProcess = Array.from(historyBatchQueue.entries()).slice(0, HISTORY_BATCH_SIZE);
    historyBatchQueue.clear();
    
    // Procesar en paralelo con limitación
    const promises = devicesToProcess.map(async ([deviceId, {resolve, reject, containerNode}]) => {
      try {
        await renderHistoryForDevice(deviceId, containerNode);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    
    await Promise.allSettled(promises);
    
    // Si quedan más en la cola, programar siguiente batch
    if (historyBatchQueue.size > 0) {
      historyBatchTimer = setTimeout(processHistoryBatch, HISTORY_BATCH_DELAY);
    }
  }
  
  // Función para agregar consulta de histórico al batch
  function queueHistoryRequest(deviceId, containerNode) {
    return new Promise((resolve, reject) => {
      // Si ya está en la cola para este dispositivo, actualizar
      if (historyBatchQueue.has(deviceId)) {
        const existing = historyBatchQueue.get(deviceId);
        existing.containerNode = containerNode;
        existing.resolve = resolve;
        existing.reject = reject;
      } else {
        historyBatchQueue.set(deviceId, {resolve, reject, containerNode});
      }
      
      // Programar procesamiento del batch
      if (historyBatchTimer) {
        clearTimeout(historyBatchTimer);
      }
      
      // Si la cola está llena, procesar inmediatamente
      if (historyBatchQueue.size >= HISTORY_BATCH_SIZE) {
        processHistoryBatch();
      } else {
        // Si no, esperar el delay para agrupar más consultas
        historyBatchTimer = setTimeout(processHistoryBatch, HISTORY_BATCH_DELAY);
      }
    });
  }

  // Cargar histórico para un dispositivo (MariaDB + InfluxDB)
  async function renderHistoryForDevice(deviceId, containerNode) {
    try {
      // Contenedor de histórico
      let history = containerNode.querySelector?.('.device-history');
      if (!history) {
        history = el('div', { class: 'device-history', style: 'margin-top:6px; background:#fff; border:1px solid #eee; border-radius:4px; padding:6px;' });
        containerNode.appendChild(history);
      }
      history.innerHTML = '<div style="text-align:center; padding:6px; color:#666; font-size:0.9em;">Cargando histórico...</div>';

      // Cargar datos de sensores desde MariaDB (con cache)
      const mdb = await DevicesAPI.getDeviceSensorData(deviceId, 20).catch(() => ({ success:false, data:[] }));
      const rows = (mdb && mdb.success && Array.isArray(mdb.data)) ? mdb.data : [];

      // Cargar datos históricos desde InfluxDB (con cache)
      const influxData = await DevicesAPI.getHistoricalData(deviceId, 50, "24h").catch(() => ({ success:false, data:[] }));
      const influxRows = (influxData && influxData.success && Array.isArray(influxData.data)) ? influxData.data : [];

      history.innerHTML = '';

      // Tab de selección (MariaDB vs InfluxDB)
      const tabs = el('div', { style: 'display:flex; gap:6px; margin-bottom:6px; border-bottom:2px solid #e0e0e0; padding-bottom:4px;' });
      let activeTab = 'mariadb';
      
      const mariadbTab = el('button', {
        class: 'btn btn-sm',
        style: `padding: 4px 12px; border: none; border-bottom: 2px solid ${activeTab === 'mariadb' ? '#2196F3' : 'transparent'}; background: none; cursor: pointer; color: ${activeTab === 'mariadb' ? '#2196F3' : '#666'}; font-weight: ${activeTab === 'mariadb' ? 'bold' : 'normal'}; font-size:0.85em;`,
        onclick: () => {
          activeTab = 'mariadb';
          mariadbTab.style.color = '#2196F3';
          mariadbTab.style.fontWeight = 'bold';
          mariadbTab.style.borderBottomColor = '#2196F3';
          influxdbTab.style.color = '#666';
          influxdbTab.style.fontWeight = 'normal';
          influxdbTab.style.borderBottomColor = 'transparent';
          showTabContent('mariadb');
        }
      }, `📊 MariaDB (${rows.length})`);
      
      const influxdbTab = el('button', {
        class: 'btn btn-sm',
        style: `padding: 4px 12px; border: none; border-bottom: 2px solid ${activeTab === 'influxdb' ? '#9C27B0' : 'transparent'}; background: none; cursor: pointer; color: ${activeTab === 'influxdb' ? '#9C27B0' : '#666'}; font-weight: ${activeTab === 'influxdb' ? 'bold' : 'normal'}; font-size:0.85em;`,
        onclick: () => {
          activeTab = 'influxdb';
          influxdbTab.style.color = '#9C27B0';
          influxdbTab.style.fontWeight = 'bold';
          influxdbTab.style.borderBottomColor = '#9C27B0';
          mariadbTab.style.color = '#666';
          mariadbTab.style.fontWeight = 'normal';
          mariadbTab.style.borderBottomColor = 'transparent';
          showTabContent('influxdb');
        }
      }, `⚡ InfluxDB (${influxRows.length})`);

      tabs.appendChild(mariadbTab);
      tabs.appendChild(influxdbTab);

      // Contenedor de contenido de tabs
      const tabContent = el('div', { id: 'tab-content' });

      // Contenido MariaDB
      const mariadbContent = rows.length > 0 ? el('div', { class: 'tab-content-item', style: 'display:none;' },
        el('div', { style: 'margin-bottom:4px; font-size:11px; color:#666;' }, `📊 Últimos ${rows.length} registros de sensores`),
        el('div', { style: 'overflow-x:auto; max-height:350px;' },
          el('table', { style: 'width:100%; border-collapse:collapse; font-size:0.8em;' },
            el('thead', { style: 'position:sticky; top:0; background:#f9f9f9; z-index:1;' },
              el('tr', {},
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Tipo Sensor'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Valor'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Unidad'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Timestamp')
              )
            ),
            el('tbody', {},
              ...rows.map((r, idx) => el('tr', { style: `background:${idx % 2 === 0 ? '#fff' : '#fafafa'};` },
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0;' }, r.tipo_sensor || '—'),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0;' }, String(r.valor ?? '—')),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0;' }, r.unidad || '—'),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; font-size:0.9em;' }, r.timestamp ? new Date(r.timestamp).toLocaleString() : '—')
              ))
            )
          )
        )
      ) : el('div', { class: 'tab-content-item', style: 'display:none; text-align:center; padding:15px; color:#999; font-size:0.9em;' }, 'No hay datos históricos en MariaDB');

      // Función para parsear datos de InfluxDB (endpoints_X_sensores_Y_humedad, etc.)
      function parseInfluxData(row) {
        const parsed = {
          timestamp: row.timestamp ? new Date(row.timestamp).toLocaleString() : '—',
          topic: row.topic || '—',
          sensors: []
        };
        
        // Extraer datos de sensores del formato endpoints_X_sensores_Y_propiedad
        const sensorMap = new Map();
        
        Object.keys(row).forEach(key => {
          if (['timestamp', 'topic', 'host'].includes(key)) return;
          
          // Patrón: endpoints_X_sensores_Y_propiedad
          const match = key.match(/^endpoints_(\d+)_sensores_(\d+)_(.+)$/);
          if (match) {
            const [, endpointIdx, sensorIdx, property] = match;
            const sensorKey = `E${endpointIdx}S${sensorIdx}`;
            
            if (!sensorMap.has(sensorKey)) {
              sensorMap.set(sensorKey, {
                endpoint: parseInt(endpointIdx),
                sensor: parseInt(sensorIdx),
                id: `${endpointIdx}-${sensorIdx}`
              });
            }
            
            const sensor = sensorMap.get(sensorKey);
            if (property === 'temp' || property === 'temperatura') {
              sensor.temp = row[key];
            } else if (property === 'humedad' || property === 'humidity') {
              sensor.humedad = row[key];
            } else if (property === 'posicion' || property === 'position') {
              sensor.posicion = row[key];
            } else {
              sensor[property] = row[key];
            }
          }
        });
        
        parsed.sensors = Array.from(sensorMap.values()).sort((a, b) => {
          if (a.endpoint !== b.endpoint) return a.endpoint - b.endpoint;
          return a.sensor - b.sensor;
        });
        
        return parsed;
      }

      // Contenido InfluxDB - Tabla mejorada con columnas legibles
      const influxdbContent = influxRows.length > 0 ? el('div', { class: 'tab-content-item', style: 'display:none;' },
        el('div', { style: 'margin-bottom:6px; font-size:11px; color:#666;' }, `⚡ Últimos ${influxRows.length} mensajes InfluxDB (últimas 24h)`),
        el('div', { style: 'overflow-x:auto; max-height:400px;' },
          el('table', { style: 'width:100%; border-collapse:collapse; font-size:0.8em;' },
            el('thead', { style: 'position:sticky; top:0; background:#f9f9f9; z-index:1;' },
              el('tr', {},
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Timestamp'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Tópico'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Endpoint'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Sensor'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Posición'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Temp (°C)'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Humedad (%)')
              )
            ),
            el('tbody', {},
              ...influxRows.flatMap(r => {
                const parsed = parseInfluxData(r);
                if (parsed.sensors.length === 0) {
                  // Si no hay sensores parseados, mostrar fila simple
                  return [el('tr', { style: 'background:#fff;' },
                    el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0;' }, parsed.timestamp),
                    el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0;' }, parsed.topic),
                    el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center;', colSpan: 5 }, 'Sin datos de sensores estructurados')
                  )];
                }
                // Una fila por sensor
                return parsed.sensors.map((sensor, idx) => el('tr', { 
                  style: `background:${idx % 2 === 0 ? '#fff' : '#fafafa'};` 
                },
                  idx === 0 ? el('td', { 
                    style: 'padding:4px 6px; border:1px solid #f0f0f0;', 
                    rowSpan: parsed.sensors.length 
                  }, parsed.timestamp) : null,
                  idx === 0 ? el('td', { 
                    style: 'padding:4px 6px; border:1px solid #f0f0f0;', 
                    rowSpan: parsed.sensors.length 
                  }, parsed.topic) : null,
                  el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:500;' }, `E${sensor.endpoint}`),
                  el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:500;' }, `S${sensor.sensor}`),
                  el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center;' }, sensor.posicion !== undefined ? sensor.posicion : '—'),
                  el('td', { 
                    style: `padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:600; color:${sensor.temp && (sensor.temp < 15 || sensor.temp > 30) ? '#d32f2f' : '#4CAF50'};` 
                  }, sensor.temp !== undefined ? `${sensor.temp.toFixed(1)}°C` : '—'),
                  el('td', { 
                    style: `padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:600; color:${sensor.humedad && (sensor.humedad < 30 || sensor.humedad > 80) ? '#d32f2f' : '#4CAF50'};` 
                  }, sensor.humedad !== undefined ? `${sensor.humedad.toFixed(1)}%` : '—')
                ));
              })
            )
          )
        )
      ) : el('div', { class: 'tab-content-item', style: 'display:none; text-align:center; padding:15px; color:#999; font-size:0.9em;' }, 'No hay datos históricos en InfluxDB');

      tabContent.appendChild(mariadbContent);
      tabContent.appendChild(influxdbContent);

      // Función para mostrar contenido del tab
      function showTabContent(tab) {
        Array.from(tabContent.querySelectorAll('.tab-content-item')).forEach(item => {
          item.style.display = 'none';
        });
        if (tab === 'mariadb') mariadbContent.style.display = 'block';
        else influxdbContent.style.display = 'block';
      }

      history.appendChild(tabs);
      history.appendChild(tabContent);

      // Mostrar tab inicial
      showTabContent('mariadb');
    } catch (err) {
      console.error('[DISPOSITIVOS] Error renderizando histórico:', err);
      try {
        if (history) history.innerHTML = '<div style="margin-top:8px; color:#d32f2f;">Error cargando histórico: ' + err.message + '</div>';
      } catch {}
    }
  }


  // Cargar dispositivos inicialmente
  let currentDevices = await loadDevicesFromDB();

  // Header de la página
  const header = el("div", { class: "card card-feature" },
    el("h2", { class: "text-2xl font-bold mb-2" }, "Vista General de Dispositivos"),
    el("p", { class: "muted text-lg" }, "Monitoreo completo del estado de todos los dispositivos IoT del sistema")
  );

  // Trackear sensores huérfanos ya advertidos (evitar warnings repetitivos)
  const orphanedSensors = new Set();
  const orphanedEndpoints = new Set();
  
  // Función para organizar dispositivos jerárquicamente
  // Estructura: Gateway → Endpoints → Sensores
  function organizeDevicesHierarchy(devices) {
    const gateways = [];
    const endpointsByGateway = {};
    const sensorsByEndpoint = {};
    
    // Solo log detallado en primera carga o cambios significativos
    const isFirstLoad = orphanedSensors.size === 0 && orphanedEndpoints.size === 0;
    
    // Paso 1: Identificar y ordenar gateways
    devices.forEach(device => {
      if (device.tipo === 'gateway') {
        gateways.push(device);
        endpointsByGateway[device.id_dispositivo] = [];
        if (isFirstLoad) {
          console.log('[DISPOSITIVOS] ✅ Gateway:', device.id_dispositivo);
        }
      }
    });
    
    // Paso 2: Asignar endpoints a sus gateways correspondientes
    devices.forEach(device => {
      if (device.tipo === 'endpoint') {
        const gatewayId = device.id_gateway || null;
        
        if (gatewayId && endpointsByGateway.hasOwnProperty(gatewayId)) {
          endpointsByGateway[gatewayId].push(device);
          // Inicializar array de sensores para este endpoint
          sensorsByEndpoint[device.id_dispositivo] = [];
          if (isFirstLoad) {
            console.log('[DISPOSITIVOS]   └─ Endpoint:', device.id_dispositivo, '→ Gateway:', gatewayId);
          }
        } else {
          // Solo advertir la primera vez que se detecta este endpoint huérfano
          if (!orphanedEndpoints.has(device.id_dispositivo)) {
            console.warn('[DISPOSITIVOS] ⚠️ Endpoint sin gateway válido:', device.id_dispositivo, '→ gateway_id:', gatewayId);
            orphanedEndpoints.add(device.id_dispositivo);
          }
          // Crear entrada para endpoints huérfanos
          if (!endpointsByGateway['_orphan']) {
            endpointsByGateway['_orphan'] = [];
          }
          endpointsByGateway['_orphan'].push(device);
          sensorsByEndpoint[device.id_dispositivo] = [];
        }
      }
    });
    
    // Paso 3: Asignar sensores a sus endpoints correspondientes
    devices.forEach(device => {
      if (device.tipo === 'sensor') {
        const endpointId = device.id_endpoint || null;
        
        if (endpointId) {
          if (!sensorsByEndpoint[endpointId]) {
            sensorsByEndpoint[endpointId] = [];
          }
          sensorsByEndpoint[endpointId].push(device);
          if (isFirstLoad) {
            console.log('[DISPOSITIVOS]     └─ Sensor:', device.id_dispositivo, '→ Endpoint:', endpointId);
          }
        } else {
          // Solo advertir la primera vez que se detecta este sensor huérfano
          if (!orphanedSensors.has(device.id_dispositivo)) {
            console.warn('[DISPOSITIVOS] ⚠️ Sensor sin endpoint válido:', device.id_dispositivo);
            orphanedSensors.add(device.id_dispositivo);
          }
          // Crear entrada para sensores huérfanos
          if (!sensorsByEndpoint['_orphan']) {
            sensorsByEndpoint['_orphan'] = [];
          }
          sensorsByEndpoint['_orphan'].push(device);
        }
      }
    });
    
    // Estadísticas de la jerarquía (solo log en primera carga o cambios)
    const totalEndpoints = Object.values(endpointsByGateway).flat().length;
    const totalSensors = Object.values(sensorsByEndpoint).flat().length;
    
    if (isFirstLoad) {
      console.log('[DISPOSITIVOS] 📊 Jerarquía organizada:', {
        gateways: gateways.length,
        totalEndpoints: totalEndpoints,
        totalSensors: totalSensors,
        endpointsPorGateway: Object.fromEntries(
          Object.entries(endpointsByGateway).map(([gw, eps]) => [gw, eps.length])
        )
      });
    }
    
    return { gateways, endpointsByGateway, sensorsByEndpoint };
  }
  
  // Función para obtener estado del dispositivo
  function getDeviceStatusColor(device) {
    if (device.estado === 'en_linea') return '#4CAF50';
    if (device.estado === 'fuera_linea') return '#FF9800';
    return '#F44336';
  }
  


  // Contenedor principal de dispositivos
  const devicesContainer = el("div", {
    id: "devices-overview-container",
    style: "margin-top: 20px;"
  });

  // Debounce para evitar actualizaciones muy frecuentes
  let updateDebounceTimer = null;
  const UPDATE_DEBOUNCE_MS = 1000; // 1 segundo de debounce
  
  // Función para actualizar la vista de dispositivos
  async function updateDevicesView(forceRefresh = false) {
    // Aplicar debounce si no es forzado
    if (!forceRefresh && updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
    }
    
    return new Promise((resolve) => {
      updateDebounceTimer = setTimeout(async () => {
        devicesContainer.innerHTML = "";
        
        // Recargar dispositivos si es necesario (cada 45 segundos o manual)
        // Considerando que las lecturas se reciben cada 30+ segundos
        const now = new Date();
        const refreshInterval = 45 * 1000; // 45 segundos
        const lastRefreshTime = lastUpdate ? now.getTime() - lastUpdate.getTime() : refreshInterval + 1;
        
        if (forceRefresh || !lastUpdate || lastRefreshTime >= refreshInterval) {
          currentDevices = await loadDevicesFromDB();
        }
    
    // Verificar si hay dispositivos
    let validDevices = Array.isArray(currentDevices) && currentDevices.length > 0 ? currentDevices : [];

    // Fallback si no hay en DB
    if (validDevices.length === 0) {
      const fallback = await loadDevicesFromSystemStatus();
      if (fallback.length > 0) {
        validDevices = fallback;
      }
    }

    if (validDevices.length === 0) {
      // Mostrar mensaje cuando no hay dispositivos
      const noDevicesMessage = el("div", { class: "card" },
        el("div", {
          style: "text-align: center; padding: 60px; color: #666;"
        },
          el("div", { style: "font-size: 3em; margin-bottom: 20px;" }, "📱"),
          el("h3", { style: "margin-bottom: 15px; font-size: 1.5em;" }, "No hay dispositivos disponibles"),
          el("p", { style: "margin-bottom: 30px; color: #888;" }, 
            "La base de datos no contiene dispositivos IoT registrados. " +
            "Verifica que los scripts de inicialización se hayan ejecutado correctamente."
          ),
          el("button", {
            class: "btn btn-primary",
            onclick: async () => {
              try {
                const response = await DevicesAPI.getAllDevices();
                if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                  setDevices(response.data);
                  location.reload();
                }
              } catch (error) {
                console.error('Error recargando dispositivos:', error);
                alert('Error al recargar dispositivos: ' + error.message);
              }
            }
          }, "🔄 Intentar Cargar Dispositivos")
        )
      );
      devicesContainer.appendChild(noDevicesMessage);
      return;
    }
    
    // Mostrar indicador de carga
    const loadingDiv = el("div", {
      style: "text-align: center; padding: 40px; color: #666;"
    }, 
      el("div", { style: "font-size: 1.2em; margin-bottom: 10px;" }, "🔄"),
      el("div", {}, "Analizando estado de dispositivos...")
    );
    devicesContainer.appendChild(loadingDiv);

      try {
        // Organizar dispositivos jerárquicamente
        const { gateways, endpointsByGateway, sensorsByEndpoint } = organizeDevicesHierarchy(validDevices);

      // Limpiar indicador de carga
      devicesContainer.innerHTML = "";

        // Crear container principal
        const mainContainer = el("div", {
          style: "display: flex; flex-direction: column; gap: 20px;"
      });

      // Estadísticas generales
      const stats = {
          totalGateways: gateways.length,
          totalEndpoints: Object.values(endpointsByGateway).flat().length,
          totalSensors: Object.values(sensorsByEndpoint).flat().length,
          totalOnline: validDevices.filter(d => d.estado === 'en_linea').length,
          totalOffline: validDevices.filter(d => d.estado === 'fuera_linea').length
        };

        // Crear card de estadísticas
        const statsCard = el("div", { class: "card" },
          el("h3", { style: "margin-bottom: 15px;" }, "📊 Resumen del Sistema"),
        el("div", {
          style: "display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;"
        },
          el("div", {
              style: "text-align: center; padding: 15px; background: #e3f2fd; border-radius: 8px; border: 2px solid #2196F3;"
            },
              el("div", { style: "font-size: 2em; font-weight: bold; color: #1976D2;" }, stats.totalGateways),
              el("div", { style: "color: #666;" }, "Gateways")
            ),
            el("div", {
              style: "text-align: center; padding: 15px; background: #f3e5f5; border-radius: 8px; border: 2px solid #9c27b0;"
            },
              el("div", { style: "font-size: 2em; font-weight: bold; color: #7b1fa2;" }, stats.totalEndpoints),
              el("div", { style: "color: #666;" }, "Endpoints")
          ),
          el("div", {
              style: "text-align: center; padding: 15px; background: #fff3e0; border-radius: 8px; border: 2px solid #ff9800;"
          },
              el("div", { style: "font-size: 2em; font-weight: bold; color: #e65100;" }, stats.totalSensors),
              el("div", { style: "color: #666;" }, "Sensores")
          ),
          el("div", {
              style: "text-align: center; padding: 15px; background: #e8f5e8; border-radius: 8px; border: 2px solid #4caf50;"
          },
              el("div", { style: "font-size: 2em; font-weight: bold; color: #2e7d32;" }, stats.totalOnline),
              el("div", { style: "color: #666;" }, "En Línea")
          ),
          el("div", {
              style: "text-align: center; padding: 15px; background: #fff3e0; border-radius: 8px; border: 2px solid #ff9800;"
            },
              el("div", { style: "font-size: 2em; font-weight: bold; color: #f57c00;" }, stats.totalOffline),
              el("div", { style: "color: #666;" }, "Fuera de Línea")
            )
          )
        );

        mainContainer.appendChild(statsCard);

        // Crear estructura jerárquica mejorada: Gateway → Endpoints → Sensores
        gateways.forEach(gateway => {
          const gatewayColor = getDeviceStatusColor(gateway);
          const endpoints = endpointsByGateway[gateway.id_dispositivo] || [];
          const totalSensorsForGateway = endpoints.reduce((total, ep) => {
            return total + (sensorsByEndpoint[ep.id_dispositivo]?.length || 0);
          }, 0);
          
          // Card principal del Gateway
          const gatewayCard = el("div", { 
            class: "card gateway-card",
            style: `border-left: 5px solid ${gatewayColor}; background: linear-gradient(to right, ${gatewayColor}08, transparent); margin-bottom: 15px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`
          },
            // Header del Gateway
            el("div", { style: "display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #e8e8e8;" },
              el("div", { style: "flex: 1;" },
                el("div", { style: "display: flex; align-items: center; gap: 12px; margin-bottom: 8px;" },
                  el("span", { style: `width: 16px; height: 16px; border-radius: 50%; background-color: ${gatewayColor}; box-shadow: 0 0 10px ${gatewayColor}60; animation: pulse 2s infinite;` }),
                  el("h3", { style: "margin: 0; color: #1a1a1a; font-size: 1.3em; font-weight: 600;" },
                    `🌐 Gateway ${gateway.id_dispositivo}`,
                    el("span", { style: "font-size: 0.7em; color: #666; font-weight: normal; margin-left: 8px;" }, gateway.nombre || '')
                  )
                ),
                el("div", { style: "display: flex; gap: 15px; flex-wrap: wrap; margin-top: 6px;" },
                  el("p", { style: "margin: 0; color: #666; font-size: 0.85em; display: flex; align-items: center; gap: 4px;" },
                    el("span", {}, "📍"),
                    gateway.ubicacion || 'Sin ubicación'
                  ),
                  el("p", { style: "margin: 0; color: #666; font-size: 0.85em; display: flex; align-items: center; gap: 4px;" },
                    el("span", {}, "🔗"),
                    `${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}`
                  ),
                  el("p", { style: "margin: 0; color: #666; font-size: 0.85em; display: flex; align-items: center; gap: 4px;" },
                    el("span", {}, "📡"),
                    `${totalSensorsForGateway} sensor${totalSensorsForGateway !== 1 ? 'es' : ''}`
                  )
                )
              ),
              el("div", { 
                style: `padding: 8px 20px; border-radius: 25px; background: ${gatewayColor}15; color: ${gatewayColor}; font-weight: bold; font-size: 0.85em; border: 2px solid ${gatewayColor}40; white-space: nowrap;` 
              }, 
                gateway.estado === 'en_linea' ? '● En Línea' : gateway.estado === 'fuera_linea' ? '○ Fuera de Línea' : '⚠ Error'
              )
            )
          );

          // Contenedor de Endpoints
          if (endpoints.length > 0) {
            const endpointsContainer = el("div", { 
              style: "margin-top: 10px; padding-left: 30px; position: relative;",
              class: "endpoints-container"
            },
              // Línea vertical conectora
              el("div", { 
                style: `position: absolute; left: 15px; top: 0; bottom: 0; width: 3px; background: linear-gradient(to bottom, ${gatewayColor}40, transparent); border-radius: 2px;` 
              })
            );
            
            endpoints.forEach((endpoint, epIndex) => {
              const endpointColor = getDeviceStatusColor(endpoint);
              const sensors = sensorsByEndpoint[endpoint.id_dispositivo] || [];
              const isLastEndpoint = epIndex === endpoints.length - 1;
              
              // Card del Endpoint
              const endpointCard = el("div", { 
                class: "card endpoint-card",
                style: `margin-bottom: 12px; padding: 10px; border-left: 4px solid ${endpointColor}; background: #fafafa; border-radius: 6px; position: relative; box-shadow: 0 1px 4px rgba(0,0,0,0.05);`
              },
                // Header del Endpoint
                el("div", { style: "display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e8e8e8;" },
                  el("div", { style: "flex: 1;" },
                    el("div", { style: "display: flex; align-items: center; gap: 10px; margin-bottom: 6px;" },
                      // Línea horizontal conectora
                      el("div", { 
                        style: `width: 20px; height: 2px; background: ${gatewayColor}60; position: relative;` 
                      },
                        el("div", { 
                          style: `position: absolute; right: -8px; top: -6px; width: 12px; height: 12px; border-radius: 50%; background: ${endpointColor}; border: 2px solid white; box-shadow: 0 0 6px ${endpointColor}60;` 
                        })
                      ),
                      el("h4", { style: "margin: 0; color: #2a2a2a; font-size: 1.1em; font-weight: 600; display: flex; align-items: center; gap: 8px;" },
                        el("span", {}, "🔌"),
                        `Endpoint ${endpoint.id_dispositivo}`,
                        el("span", { style: "font-size: 0.75em; color: #888; font-weight: normal; margin-left: 6px;" }, endpoint.nombre ? `(${endpoint.nombre})` : '')
                      )
                    ),
                    el("div", { style: "display: flex; gap: 16px; flex-wrap: wrap; margin-left: 30px;" },
                      el("p", { style: "margin: 0; color: #666; font-size: 0.85em;" }, `📍 ${endpoint.ubicacion || 'Sin ubicación'}`),
                      el("p", { style: "margin: 0; color: #666; font-size: 0.85em; font-weight: 500;" },
                        `📡 ${sensors.length} sensor${sensors.length !== 1 ? 'es' : ''}`
                      )
                    )
                  ),
                  el("div", { 
                    style: `padding: 4px 12px; border-radius: 18px; background: ${endpointColor}15; color: ${endpointColor}; font-weight: 600; font-size: 0.75em; border: 1px solid ${endpointColor}30;` 
                  }, 
                    endpoint.estado === 'en_linea' ? '● En Línea' : endpoint.estado === 'fuera_linea' ? '○ Fuera de Línea' : '⚠ Error'
                  )
                )
              );

              // Botón para ver histórico del endpoint (usar batching)
              try {
                endpointCard.appendChild(el('div', { style: 'margin-top: 8px; margin-left: 30px;' },
                  el('button', {
                    class: 'btn btn-sm',
                    style: 'background: #2196F3; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.85em;',
                    onclick: async () => { await queueHistoryRequest(endpoint.id_dispositivo, endpointCard); }
                  }, '📈 Ver Histórico')
                ));
              } catch {}

              // Contenedor de Sensores
              if (sensors.length > 0) {
                try {
                  const sensorsContainer = el("div", { 
                    style: "margin-top: 15px; padding-left: 35px; position: relative;",
                    class: "sensors-container"
                  },
                    // Línea vertical conectora de sensores
                    el("div", { 
                      style: `position: absolute; left: 20px; top: 0; bottom: ${isLastEndpoint ? '20px' : '0'}; width: 2px; background: linear-gradient(to bottom, ${endpointColor}30, transparent);` 
                    })
                  );
                  
                  sensors.forEach((sensor, sensorIndex) => {
                    try {
                      const sensorColor = getDeviceStatusColor(sensor);
                      const sensorName = (sensor.nombre ? String(sensor.nombre) : `Sensor ${sensor.id_dispositivo || 'unknown'}`).trim();
                      const isLastSensor = sensorIndex === sensors.length - 1;
                      
                      const sensorItem = el("div", {
                        class: "sensor-item",
                        style: `padding: 8px 10px; margin-bottom: ${isLastSensor ? '0' : '6px'}; background: white; border-left: 3px solid ${sensorColor}; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative;`
                      },
                        // Línea horizontal conectora de sensor
                        el("div", { 
                          style: `position: absolute; left: -35px; top: 50%; width: 15px; height: 2px; background: ${endpointColor}40;` 
                        },
                          el("div", { 
                            style: `position: absolute; right: -6px; top: -5px; width: 10px; height: 10px; border-radius: 50%; background: ${sensorColor}; border: 2px solid white; box-shadow: 0 0 4px ${sensorColor}50;` 
                          })
                        ),
                        el("div", { style: "display: flex; align-items: center; gap: 10px; font-size: 0.9em; color: #444; flex: 1;" },
                          el("span", { style: `width: 10px; height: 10px; border-radius: 50%; background-color: ${sensorColor}; box-shadow: 0 0 6px ${sensorColor}40;` }),
                          el("span", { style: "font-weight: 500;" }, "🌡️"),
                          el("span", { style: "font-weight: 500;" }, sensorName),
                          el("span", { style: "font-size: 0.85em; color: #999; margin-left: 8px;" }, sensor.id_dispositivo)
                        ),
                        el('div', { style: 'display:flex; align-items:center; gap:10px;' },
                          el("span", { 
                            style: `padding: 4px 10px; border-radius: 12px; background: ${sensorColor}15; color: ${sensorColor}; font-weight: 600; font-size: 0.75em; border: 1px solid ${sensorColor}25;` 
                          },
                            sensor.estado === 'en_linea' ? '● Activo' : '○ Inactivo'
                          ),
                          el('button', { 
                            class: 'btn btn-xs', 
                            style: 'padding: 4px 10px; font-size: 0.75em;',
                            onclick: async () => { await queueHistoryRequest(sensor.id_dispositivo, sensorItem); } 
                          }, '📈 Histórico')
                        )
                      );
                      
                      if (sensorsContainer && sensorItem instanceof Node) {
                        sensorsContainer.appendChild(sensorItem);
                      }
                    } catch (sensorError) {
                      console.error('Error creating sensor item:', sensorError, { sensor, sensorId: sensor.id_dispositivo });
                    }
                  });
                  
                  if (endpointCard && sensorsContainer instanceof Node && sensorsContainer.children.length > 0) {
                    endpointCard.appendChild(sensorsContainer);
                  }
                } catch (sensorsListError) {
                  console.error('Error creating sensors list:', sensorsListError);
                }
              } else {
                // Mostrar mensaje si no hay sensores
                endpointCard.appendChild(el('div', {
                  style: 'margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 6px; text-align: center; color: #999; font-size: 0.85em; margin-left: 30px;'
                }, '📭 Sin sensores asociados'));
              }
              
              try {
                if (endpointsContainer && endpointCard instanceof Node) {
                  endpointsContainer.appendChild(endpointCard);
                }
              } catch (endpointAppendError) {
                console.error('Error appending endpoint card:', endpointAppendError);
              }
            });
            
            try {
              if (gatewayCard && endpointsContainer instanceof Node && endpointsContainer.children.length > 0) {
                gatewayCard.appendChild(endpointsContainer);
              }
            } catch (gatewayAppendError) {
              console.error('Error appending endpoints container:', gatewayAppendError);
            }
          } else {
            // Mostrar mensaje si no hay endpoints
            gatewayCard.appendChild(el('div', {
              style: 'margin-top: 15px; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center; color: #999;'
            }, '📭 Este gateway no tiene endpoints asociados'));
          }
          
          try {
            if (mainContainer && gatewayCard instanceof Node) {
              mainContainer.appendChild(gatewayCard);
            }
          } catch (mainAppendError) {
            console.error('Error appending gateway card:', mainAppendError);
          }
        });

        devicesContainer.appendChild(mainContainer);

    } catch (error) {
      console.error('Error actualizando vista de dispositivos:', error);
      devicesContainer.innerHTML = "";
      devicesContainer.appendChild(el("div", {
        style: "text-align: center; padding: 40px; color: #d32f2f;"
      }, 
        el("div", { style: "font-size: 1.2em; margin-bottom: 10px;" }, "❌"),
        el("div", {}, "Error cargando dispositivos: " + error.message)
      ));
    }
    
    resolve();
      }, forceRefresh ? 0 : UPDATE_DEBOUNCE_MS);
    });
  }

  // Botón de actualización
  const refreshButton = el("button", {
    class: "btn",
    style: "margin-bottom: 20px;",
    onclick: async () => {
      currentDevices = await loadDevicesFromDB();
      await updateDevicesView(true); // Forzar actualización
      updateLastUpdateIndicator();
    }
  }, "🔄 Actualizar Vista");

  // Agregar indicador de última actualización
  const lastUpdateIndicator = el("div", {
    id: "last-update-indicator",
    style: "font-size: 0.85em; color: #666; margin-bottom: 15px; padding: 8px; background: #f5f5f5; border-radius: 4px;"
  }, "Última actualización: Cargando...");

  // Función para actualizar el indicador
  function updateLastUpdateIndicator() {
    if (lastUpdate) {
      const timeStr = lastUpdate.toLocaleTimeString();
      lastUpdateIndicator.textContent = `Última actualización: ${timeStr}`;
    }
  }

  // Actualizar indicador
  updateLastUpdateIndicator();

  // Auto-refresh cada 45 segundos (optimizado para lecturas cada 30+ segundos)
  // Esto permite capturar nuevas lecturas sin saturar el servidor
  const autoRefreshInterval = setInterval(async () => {
    await updateDevicesView(false); // No forzar, usar debounce
    updateLastUpdateIndicator();
  }, 45 * 1000); // 45 segundos

  // Limpiar intervalos y timers al salir
  window.addEventListener('beforeunload', () => {
    clearInterval(autoRefreshInterval);
    if (historyBatchTimer) {
      clearTimeout(historyBatchTimer);
    }
    if (updateDebounceTimer) {
      clearTimeout(updateDebounceTimer);
    }
  });

  // Crear dashboard de InfluxDB (similar al de MQTT pero con datos históricos)
  async function createInfluxDBDashboard() {
    const dashboardContainer = el("div", { 
      class: "card", 
      style: "margin-top: 15px; margin-bottom: 15px; padding: 10px;" 
    },
      el("h3", { style: "margin-bottom: 10px; font-size: 1.1em; padding-bottom: 8px; border-bottom: 2px solid #9C27B0;" }, "📊 Dashboard InfluxDB - Datos Históricos"),
      el("div", { id: "influx-dashboard-content", style: "min-height: 200px;" }, "Cargando datos de InfluxDB...")
    );

    // Cargar datos de InfluxDB para el dashboard
    async function loadInfluxDashboard() {
      try {
        const content = dashboardContainer.querySelector('#influx-dashboard-content');
        if (!content) return;

        // Cargar datos de todos los dispositivos (última hora)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));

        // Obtener dispositivos
        const devicesResponse = await DevicesAPI.getAllDevices();
        if (!devicesResponse.success || !Array.isArray(devicesResponse.data)) {
          content.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay dispositivos disponibles</div>';
          return;
        }

        const devices = devicesResponse.data;
        const sensors = devices.filter(d => d.tipo === 'sensor');
        
        if (sensors.length === 0) {
          content.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay sensores disponibles</div>';
          return;
        }

        // Cargar datos históricos de InfluxDB para cada sensor (última hora)
        const dashboardData = [];
        
        for (const sensor of sensors.slice(0, 10)) { // Limitar a 10 sensores para no saturar
          try {
            const influxResponse = await DevicesAPI.getHistoricalData(
              sensor.id_dispositivo, 
              20, // Últimos 20 puntos
              "1h" // Última hora
            );
            
            if (influxResponse.success && Array.isArray(influxResponse.data) && influxResponse.data.length > 0) {
              // Parsear datos del sensor
              influxResponse.data.forEach(row => {
                const parsed = parseInfluxSensorData(row, sensor.id_dispositivo);
                if (parsed) {
                  dashboardData.push(parsed);
                }
              });
            }
          } catch (err) {
            console.warn(`Error cargando datos de InfluxDB para sensor ${sensor.id_dispositivo}:`, err);
          }
        }

        // Ordenar por timestamp (más reciente primero)
        dashboardData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Renderizar dashboard
        if (dashboardData.length === 0) {
          content.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay datos de InfluxDB disponibles en la última hora</div>';
          return;
        }

        // Crear tabla de dashboard
        const dashboardTable = el('div', { style: 'overflow-x:auto; max-height:400px;' },
          el('table', { style: 'width:100%; border-collapse:collapse; font-size:0.8em;' },
            el('thead', { style: 'position:sticky; top:0; background:#f9f9f9; z-index:1;' },
              el('tr', {},
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Timestamp'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Endpoint'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Sensor'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Posición'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Temp (°C)'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:center; font-size:0.85em; background:#f0f0f0;' }, 'Humedad (%)'),
                el('th', { style: 'padding:4px 6px; border:1px solid #ddd; text-align:left; font-size:0.85em; background:#f0f0f0;' }, 'Tópico')
              )
            ),
            el('tbody', {},
              ...dashboardData.slice(0, 50).map((item, idx) => el('tr', { 
                style: `background:${idx % 2 === 0 ? '#fff' : '#fafafa'};` 
              },
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; font-size:0.9em;' }, item.timestamp),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:500;' }, item.endpoint !== undefined ? `E${item.endpoint}` : '—'),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:500;' }, item.sensor !== undefined ? `S${item.sensor}` : '—'),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; text-align:center;' }, item.posicion !== undefined ? item.posicion : '—'),
                el('td', { 
                  style: `padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:600; color:${item.temp && (item.temp < 15 || item.temp > 30) ? '#d32f2f' : '#4CAF50'};` 
                }, item.temp !== undefined ? `${item.temp.toFixed(1)}°C` : '—'),
                el('td', { 
                  style: `padding:4px 6px; border:1px solid #f0f0f0; text-align:center; font-weight:600; color:${item.humedad && (item.humedad < 30 || item.humedad > 80) ? '#d32f2f' : '#4CAF50'};` 
                }, item.humedad !== undefined ? `${item.humedad.toFixed(1)}%` : '—'),
                el('td', { style: 'padding:4px 6px; border:1px solid #f0f0f0; font-size:0.85em; color:#666;' }, item.topic || '—')
              ))
            )
          )
        );

        content.innerHTML = '';
        content.appendChild(el('div', { style: 'margin-bottom:6px; font-size:11px; color:#666;' }, `📊 Mostrando últimos ${Math.min(dashboardData.length, 50)} registros de InfluxDB`));
        content.appendChild(dashboardTable);

      } catch (error) {
        console.error('Error cargando dashboard de InfluxDB:', error);
        const content = dashboardContainer.querySelector('#influx-dashboard-content');
        if (content) {
          content.innerHTML = `<div style="text-align:center; padding:20px; color:#d32f2f;">Error cargando dashboard: ${error.message}</div>`;
        }
      }
    }

    // Función auxiliar para parsear datos de sensor de InfluxDB
    function parseInfluxSensorData(row, sensorId) {
      const parsed = {
        timestamp: row.timestamp ? new Date(row.timestamp).toLocaleString() : '—',
        topic: row.topic || '—',
        sensorId: sensorId
      };

      // Buscar datos de este sensor en el formato endpoints_X_sensores_Y_propiedad
      Object.keys(row).forEach(key => {
        if (['timestamp', 'topic', 'host'].includes(key)) return;
        
        const match = key.match(/^endpoints_(\d+)_sensores_(\d+)_(.+)$/);
        if (match) {
          const [, endpointIdx, sensorIdx, property] = match;
          
          // Solo procesar si coincide con algún índice de sensor conocido
          if (property === 'temp' || property === 'temperatura') {
            parsed.temp = row[key];
            parsed.endpoint = parseInt(endpointIdx);
            parsed.sensor = parseInt(sensorIdx);
          } else if (property === 'humedad' || property === 'humidity') {
            parsed.humedad = row[key];
            if (!parsed.endpoint) parsed.endpoint = parseInt(endpointIdx);
            if (!parsed.sensor) parsed.sensor = parseInt(sensorIdx);
          } else if (property === 'posicion' || property === 'position') {
            parsed.posicion = row[key];
          }
        }
      });

      return (parsed.temp !== undefined || parsed.humedad !== undefined) ? parsed : null;
    }

    // Cargar dashboard inicialmente
    await loadInfluxDashboard();

    // Auto-refresh cada 30 segundos
    const refreshInterval = setInterval(loadInfluxDashboard, 30000);

    // Limpiar intervalo al salir
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval);
    });

    return dashboardContainer;
  }

  // Crear gráfico de series temporales basado en datos históricos de InfluxDB
  async function createInfluxTimeSeriesChart() {
    const chartContainer = el("div", { 
      class: "card dispositivos-section",
      id: "dispositivos-charts",
      style: "margin-top: 15px; margin-bottom: 15px; padding: 10px;" 
    },
      el("h3", { style: "margin-bottom: 10px; font-size: 1.1em; padding-bottom: 8px; border-bottom: 2px solid #0284c7;" }, "📈 Gráfico de Series Temporales - Datos Históricos InfluxDB"),
      el("div", { style: "margin-bottom: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;" },
        el("input", {
          type: "text",
          id: "chart-search-input",
          placeholder: "🔍 Buscar por Endpoint, Sensor o ID...",
          style: "flex: 1; min-width: 200px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9em;",
          autocomplete: "off"
        }),
        el("button", {
          class: "btn btn-sm",
          id: "clear-chart-search",
          style: "padding: 6px 12px; font-size: 0.85em;"
        }, "Limpiar")
      ),
      el("div", { id: "influx-chart-content", style: "min-height: 300px; position: relative;" }, "Cargando gráfico...")
    );

    let chartData = [];
    let filteredChartData = [];
    let searchQuery = '';
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 400;
    canvas.style.cssText = "max-width:100%;height:auto;border:1px solid #242b36;border-radius:8px;background:#1a1f2e;cursor: crosshair;";
    
    const chartContent = chartContainer.querySelector('#influx-chart-content');
    
    // Función para cargar datos de InfluxDB para el gráfico
    async function loadChartData() {
      try {
        chartContent.innerHTML = '';
        chartContent.appendChild(el('div', { style: 'text-align:center; padding:20px; color:#666;' }, 'Cargando datos históricos...'));
        
        // Obtener dispositivos
        const devicesResponse = await DevicesAPI.getAllDevices();
        if (!devicesResponse.success || !Array.isArray(devicesResponse.data)) {
          chartContent.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay dispositivos disponibles</div>';
          return;
        }

        const devices = devicesResponse.data;
        const sensors = devices.filter(d => d.tipo === 'sensor');
        
        if (sensors.length === 0) {
          chartContent.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">No hay sensores disponibles</div>';
          return;
        }

        // Cargar datos históricos de InfluxDB (última hora)
        const seriesData = new Map(); // key: `${endpoint}-${sensor}`, value: {temp: [], hum: []}
        
        for (const sensor of sensors.slice(0, 15)) { // Limitar a 15 sensores
          try {
            const influxResponse = await DevicesAPI.getHistoricalData(
              sensor.id_dispositivo, 
              60, // Últimos 60 puntos
              "1h" // Última hora
            );
            
            if (influxResponse.success && Array.isArray(influxResponse.data) && influxResponse.data.length > 0) {
              influxResponse.data.forEach(row => {
                Object.keys(row).forEach(key => {
                  if (['timestamp', 'topic', 'host'].includes(key)) return;
                  
                  const match = key.match(/^endpoints_(\d+)_sensores_(\d+)_(.+)$/);
                  if (match) {
                    const [, endpointIdx, sensorIdx, property] = match;
                    const seriesKey = `E${endpointIdx}S${sensorIdx}`;
                    
                    if (!seriesData.has(seriesKey)) {
                      seriesData.set(seriesKey, {
                        endpoint: parseInt(endpointIdx),
                        sensor: parseInt(sensorIdx),
                        id: `${endpointIdx}-${sensorIdx}`,
                        temp: [],
                        hum: []
                      });
                    }
                    
                    const series = seriesData.get(seriesKey);
                    const timestamp = row.timestamp ? new Date(row.timestamp).getTime() : Date.now();
                    
                    if ((property === 'temp' || property === 'temperatura') && row[key] !== undefined) {
                      series.temp.push({ timestamp, value: parseFloat(row[key]) });
                    } else if ((property === 'humedad' || property === 'humidity') && row[key] !== undefined) {
                      series.hum.push({ timestamp, value: parseFloat(row[key]) });
                    }
                  }
                });
              });
            }
          } catch (err) {
            console.warn(`Error cargando datos para gráfico del sensor ${sensor.id_dispositivo}:`, err);
          }
        }

        // Convertir a array y ordenar
        chartData = Array.from(seriesData.values()).map(series => ({
          ...series,
          temp: series.temp.sort((a, b) => a.timestamp - b.timestamp),
          hum: series.hum.sort((a, b) => a.timestamp - b.timestamp)
        }));

        filterCharts(searchQuery);
      } catch (error) {
        console.error('Error cargando datos para gráfico:', error);
        chartContent.innerHTML = `<div style="text-align:center; padding:20px; color:#d32f2f;">Error cargando gráfico: ${error.message}</div>`;
      }
    }

    // Función para filtrar series según búsqueda
    function filterCharts(query) {
      searchQuery = query.toLowerCase().trim();
      
      if (!searchQuery) {
        filteredChartData = [...chartData];
      } else {
        filteredChartData = chartData.filter(series => {
          const searchStr = `E${series.endpoint}S${series.sensor} ${series.id} endpoint${series.endpoint} sensor${series.sensor}`.toLowerCase();
          return searchStr.includes(searchQuery);
        });
      }
      
      renderChart();
    }

    // Función para renderizar el gráfico
    function renderChart() {
      if (!chartContent) return;
      
      chartContent.innerHTML = '';
      
      if (filteredChartData.length === 0) {
        chartContent.appendChild(el('div', { 
          style: 'text-align:center; padding:40px; color:#999;' 
        }, 'No hay datos para mostrar con los filtros aplicados'));
        return;
      }

      // Crear contenedor del canvas
      const canvasContainer = el('div', { style: 'position: relative; margin-bottom: 10px;' });
      canvasContainer.appendChild(canvas);
      chartContent.appendChild(canvasContainer);

      // Dibujar gráfico
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // Fondo con grid
      ctx.strokeStyle = "#2b3341";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (H - 40) * (i / 4) + 20;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(W - 20, y);
        ctx.stroke();
      }

      // Calcular rango de tiempo (última hora)
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      const timeRange = 60 * 60 * 1000;

      // Obtener todos los valores de temperatura y humedad
      const allTempValues = [];
      const allHumValues = [];
      filteredChartData.forEach(series => {
        series.temp.forEach(p => allTempValues.push(p.value));
        series.hum.forEach(p => allHumValues.push(p.value));
      });

      const tMin = allTempValues.length ? Math.min(...allTempValues) : 0;
      const tMax = allTempValues.length ? Math.max(...allTempValues) : 1;
      const tPad = (tMax - tMin) * 0.1 || 5;
      const tYMin = Math.floor(tMin - tPad);
      const tYMax = Math.ceil(tMax + tPad);

      const hMin = allHumValues.length ? Math.min(...allHumValues) : 0;
      const hMax = allHumValues.length ? Math.max(...allHumValues) : 100;
      const hPad = (hMax - hMin) * 0.1 || 5;
      const hYMin = Math.floor(hMin - hPad);
      const hYMax = Math.ceil(hMax + hPad);

      // Colores para series
      const COLORS = [
        "#46a0ff", "#4CAF50", "#FF5722", "#9C27B0", "#FFC107",
        "#00BCD4", "#E91E63", "#8BC34A", "#FF9800", "#3F51B5"
      ];

      function getColor(index) {
        return COLORS[index % COLORS.length];
      }

      // Función para calcular posición X desde timestamp
      const getXFromTimestamp = (timestamp) => {
        const normalizedTime = Math.max(0, Math.min(1, (timestamp - oneHourAgo) / timeRange));
        return 20 + normalizedTime * (W - 40);
      };

      // Dibujar líneas de temperatura
      filteredChartData.forEach((series, seriesIdx) => {
        if (series.temp.length === 0) return;
        
        const color = getColor(seriesIdx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        series.temp.forEach((p, i) => {
          const x = getXFromTimestamp(p.timestamp);
          const y = H - 20 - ((p.value - tYMin) / (tYMax - tYMin)) * (H - 40);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Puntos de temperatura
        ctx.fillStyle = color;
        series.temp.forEach(p => {
          const x = getXFromTimestamp(p.timestamp);
          const y = H - 20 - ((p.value - tYMin) / (tYMax - tYMin)) * (H - 40);
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      });

      // Dibujar líneas de humedad (discontinuas)
      filteredChartData.forEach((series, seriesIdx) => {
        if (series.hum.length === 0) return;
        
        const color = getColor(seriesIdx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        
        series.hum.forEach((p, i) => {
          const x = getXFromTimestamp(p.timestamp);
          const y = H - 20 - ((p.value - hYMin) / (hYMax - hYMin)) * (H - 40);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Puntos de humedad
        ctx.fillStyle = color;
        series.hum.forEach(p => {
          const x = getXFromTimestamp(p.timestamp);
          const y = H - 20 - ((p.value - hYMin) / (hYMax - hYMin)) * (H - 40);
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      });

      // Etiquetas de escala temperatura (izquierda)
      ctx.fillStyle = "#9aa4b2";
      ctx.font = "12px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`${tYMin}°C`, 5, H - 15);
      ctx.fillText(`${tYMax}°C`, 5, 25);

      // Etiquetas de escala humedad (derecha)
      ctx.textAlign = "right";
      ctx.fillText(`${hYMin}%`, W - 5, H - 15);
      ctx.fillText(`${hYMax}%`, W - 5, 25);

      // Eje X con timestamps (última hora)
      ctx.fillStyle = "#9aa4b2";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i / 5) * (W - 40);
        const timeValue = oneHourAgo + (i / 5) * timeRange;
        const timeDate = new Date(timeValue);
        const hours = timeDate.getHours().toString().padStart(2, '0');
        const minutes = timeDate.getMinutes().toString().padStart(2, '0');
        const timeLabel = `${hours}:${minutes}`;
        
        ctx.fillText(timeLabel, x, H - 5);
        
        // Línea vertical guía
        ctx.strokeStyle = "#2b3341";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, H - 20);
        ctx.stroke();
      }

      // Leyenda
      const legendContainer = el('div', { 
        style: 'margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; display: flex; flex-wrap: wrap; gap: 10px;' 
      });

      filteredChartData.forEach((series, idx) => {
        const color = getColor(idx);
        const legendItem = el('div', {
          style: `display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: white; border-radius: 4px; border-left: 3px solid ${color};`
        },
          el('span', {
            style: `width: 12px; height: 2px; background: ${color}; display: inline-block;`
          }),
          el('span', { style: 'font-size: 0.85em; font-weight: 500;' }, `E${series.endpoint}S${series.sensor}`),
          el('span', { style: 'font-size: 0.75em; color: #666;' }, `(Temp: ${series.temp.length > 0 ? series.temp[series.temp.length - 1].value.toFixed(1) + '°C' : '—'}, Hum: ${series.hum.length > 0 ? series.hum[series.hum.length - 1].value.toFixed(1) + '%' : '—'})`)
        );
        legendContainer.appendChild(legendItem);
      });

      chartContent.appendChild(legendContainer);

      // Estadísticas
      const statsContainer = el('div', {
        style: 'margin-top: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px; font-size: 0.85em; color: #666;'
      }, `📊 Mostrando ${filteredChartData.length} serie${filteredChartData.length !== 1 ? 's' : ''} de ${chartData.length} total${chartData.length !== 1 ? 'es' : ''}`);
      chartContent.appendChild(statsContainer);
    }

    // Event listeners para búsqueda y limpiar
    setTimeout(() => {
      const searchInput = chartContainer.querySelector('#chart-search-input');
      const clearButton = chartContainer.querySelector('#clear-chart-search');
      
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            filterCharts(e.target.value);
          }, 300);
        });
      }
      
      if (clearButton) {
        clearButton.addEventListener('click', () => {
          const searchInput = chartContainer.querySelector('#chart-search-input');
          if (searchInput) {
            searchInput.value = '';
            filterCharts('');
          }
        });
      }
    }, 100);

    // Cargar datos inicialmente
    await loadChartData();

    // Auto-refresh cada 30 segundos
    const refreshInterval = setInterval(loadChartData, 30000);

    // Limpiar intervalo al salir
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval);
    });

    return chartContainer;
  }

  // Construir la página con dashboard de InfluxDB y gráfico
  const influxDashboard = await createInfluxDBDashboard();
  const timeSeriesChart = await createInfluxTimeSeriesChart();
  
  // Crear menú de navegación sticky con botón hamburguesa (similar al de dashboard.js)
  const dispositivosNav = el("nav", { class: "dashboard-nav-menu" },
    el("button", { 
      class: "dashboard-nav-toggle",
      id: "dispositivos-nav-toggle",
      "aria-label": "Abrir menú de navegación",
      onclick: () => {
        const menu = dispositivosNav;
        const overlay = document.getElementById('dispositivos-nav-overlay');
        if (menu && overlay) {
          menu.classList.toggle('mobile-menu');
          menu.classList.toggle('active');
          overlay.classList.toggle('active');
          // Cambiar icono del botón
          const toggleBtn = document.getElementById('dispositivos-nav-toggle');
          if (toggleBtn) {
            toggleBtn.textContent = menu.classList.contains('active') ? '✕' : '☰';
          }
        }
      }
    }, "☰"),
    el("div", { class: "dashboard-nav-overlay", id: "dispositivos-nav-overlay", onclick: () => {
      const menu = dispositivosNav;
      const overlay = document.getElementById('dispositivos-nav-overlay');
      if (menu && overlay) {
        menu.classList.remove('mobile-menu', 'active');
        overlay.classList.remove('active');
        const toggleBtn = document.getElementById('dispositivos-nav-toggle');
        if (toggleBtn) {
          toggleBtn.textContent = '☰';
        }
      }
    }}),
    el("ul", {},
      el("li", {},
        el("a", { href: "#dispositivos-header", "data-section": "header" }, "📊 Inicio")
      ),
      el("li", {},
        el("a", { href: "#dispositivos-influx-dashboard", "data-section": "influx-dashboard" }, "📊 Dashboard InfluxDB")
      ),
      el("li", {},
        el("a", { href: "#dispositivos-charts", "data-section": "charts" }, "📈 Gráficos")
      ),
      el("li", {},
        el("a", { href: "#dispositivos-container", "data-section": "devices" }, "📱 Dispositivos")
      )
    )
  );

  // Añadir IDs y clases a las secciones
  header.id = "dispositivos-header";
  header.classList.add("dispositivos-section");
  
  influxDashboard.id = "dispositivos-influx-dashboard";
  influxDashboard.classList.add("dispositivos-section");
  
  timeSeriesChart.id = "dispositivos-charts";
  timeSeriesChart.classList.add("dispositivos-section");
  
  devicesContainer.id = "dispositivos-container";
  devicesContainer.classList.add("dispositivos-section");

  const page = el("div", {},
    dispositivosNav,
    header,
    refreshButton,
    lastUpdateIndicator,
    influxDashboard,
    timeSeriesChart,
    devicesContainer
  );

  // Script para navegación activa y scroll
  const navScript = `
    (function() {
      const navLinks = document.querySelectorAll('.dashboard-nav-menu a[data-section]');
      const sections = document.querySelectorAll('.dispositivos-section');
      
      // Función para actualizar link activo
      function updateActiveLink() {
        const scrollPos = window.scrollY + 100;
        
        sections.forEach((section) => {
          const top = section.offsetTop;
          const bottom = top + section.offsetHeight;
          
          if (scrollPos >= top && scrollPos < bottom) {
            navLinks.forEach(link => link.classList.remove('active'));
            const sectionId = section.id ? section.id.replace('dispositivos-', '') : '';
            const activeLink = document.querySelector(\`[data-section="\${sectionId}"]\`);
            if (activeLink) {
              activeLink.classList.add('active');
            }
          }
        });
      }
      
      // Event listeners
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
              const overlay = document.getElementById('dispositivos-nav-overlay');
              navMenu.classList.remove('mobile-menu', 'active');
              if (overlay) overlay.classList.remove('active');
              const toggleBtn = document.getElementById('dispositivos-nav-toggle');
              if (toggleBtn) toggleBtn.textContent = '☰';
            }
          }
        });
      });
      
      window.addEventListener('scroll', updateActiveLink);
      updateActiveLink(); // Inicial
    })();
  `;

  const pageWithScript = el("div", {},
    page,
    el("script", {}, navScript)
  );

  // Actualizar vista inicial
  await updateDevicesView();
  updateLastUpdateIndicator();

  return pageWithScript;
}

// Agregar estilos CSS para la animación de pulso y mejoras visuales
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { 
      opacity: 1; 
      transform: scale(1);
    }
    50% { 
      opacity: 0.7; 
      transform: scale(1.1);
    }
  }
  
  .gateway-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .gateway-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  }
  
  .endpoint-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .endpoint-card:hover {
    transform: translateX(5px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
  }
  
  .sensor-item {
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  
  .sensor-item:hover {
    transform: translateX(3px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
  }
`;
document.head.appendChild(style);
