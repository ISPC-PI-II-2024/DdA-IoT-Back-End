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
  const root = el("div", { class: "card" },
    el("h3", {}, title),
    el("div", { 
      class: "chart-container",
      style: "position: relative;"
    },
      el("canvas", { 
        width: 900, 
        height: 300, 
        style: "max-width:100%;height:auto;border:1px solid #242b36;border-radius:8px;background:#1a1f2e;cursor: crosshair;" 
      })
    )
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
    }
    
    // Marcar como dirty pero solo actualizar stats inmediatamente
    // El renderizado se throttlerá según chartRefreshInterval
    dirty = true;
    updateStats();
  }

  function updateStats() {
    if (!statsContainer) return;
    const sensors = Array.from(sensorIds);
    if (sensors.length === 0) return;
    const items = sensors.map(sid => {
      const tArr = seriesMap.get(`${sid}:temp`) || [];
      const hArr = seriesMap.get(`${sid}:hum`) || [];
      const latestT = tArr.length ? tArr[tArr.length - 1].value : null;
      const latestH = hArr.length ? hArr[hArr.length - 1].value : null;
      const colorT = colorForKey(`${sid}:temp`);
      const colorH = colorForKey(`${sid}:hum`);
      return `
        <div class="stat-item" style="background:#2a3f5f;padding:0.5rem;border-radius:4px;min-width:120px;">
          <div style="font-size:0.75rem;color:#9aa4b2;">Sensor ${sid}</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colorT}"></span>
            <span style="font-size:1rem;font-weight:bold;color:${colorT};">${latestT !== null ? formatTemperature(latestT) : '—'}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin-top:4px;">
            <span style="display:inline-block;width:8px;height:2px;background:${colorH}"></span>
            <span style="font-size:0.95rem;font-weight:bold;color:${colorH};">${latestH !== null ? `${latestH.toFixed(1)}%` : '—'}</span>
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

    // Escala de temperatura (todas las series de temp)
    const tempValues = [];
    seriesMap.forEach((arr, key) => {
      if (key.endsWith(":temp")) arr.forEach(p => { if (!isNaN(p.value)) tempValues.push(p.value); });
    });
    const tMin = tempValues.length ? Math.min(...tempValues) : 0;
    const tMax = tempValues.length ? Math.max(...tempValues) : 1;
    const tPad = (tMax - tMin) * 0.1 || 5;
    const tYMin = Math.floor(tMin - tPad);
    const tYMax = Math.ceil(tMax + tPad);

    // Escala de humedad (todas las series de hum)
    const humValues = [];
    seriesMap.forEach((arr, key) => {
      if (key.endsWith(":hum")) arr.forEach(p => { if (!isNaN(p.value)) humValues.push(p.value); });
    });
    const hMin = humValues.length ? Math.min(...humValues) : 0;
    const hMax = humValues.length ? Math.max(...humValues) : 100;
    const hPad = (hMax - hMin) * 0.1 || 5;
    const hYMin = Math.floor(hMin - hPad);
    const hYMax = Math.ceil(hMax + hPad);

    // Dibujar todas las líneas de temperatura (una por sensor)
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":temp")) return;
      const color = colorForKey(key);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      arr.forEach((p, i) => {
        const x = (i / (finalMaxPoints - 1)) * (W - 40) + 20;
        const y = H - 20 - ((p.value - tYMin) / (tYMax - tYMin)) * (H - 40);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Puntos (temperatura) - dibujar más grandes si están hovered
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":temp")) return;
      const color = colorForKey(key);
      ctx.fillStyle = color;
      arr.forEach((p, i) => {
        const x = (i / (finalMaxPoints - 1)) * (W - 40) + 20;
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

    // Dibujar todas las líneas de humedad (una por sensor) - con línea discontinua
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":hum")) return;
      const color = colorForKey(key);
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      arr.forEach((p, i) => {
        const x = (i / (finalMaxPoints - 1)) * (W - 40) + 20;
        const y = H - 20 - ((p.value - hYMin) / (hYMax - hYMin)) * (H - 40);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });
    
    // Puntos (humedad) - dibujar más grandes si están hovered
    seriesMap.forEach((arr, key) => {
      if (!key.endsWith(":hum")) return;
      const color = colorForKey(key);
      ctx.fillStyle = color;
      arr.forEach((p, i) => {
        const x = (i / (finalMaxPoints - 1)) * (W - 40) + 20;
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

    // Leyenda
    let legendY = 15;
    ctx.font = "12px system-ui";
    ctx.textAlign = "left";
    sensorIds.forEach(sid => {
      const keyT = `${sid}:temp`;
      const keyH = `${sid}:hum`;
      const cT = colorForKey(keyT);
      const cH = colorForKey(keyH);
      // temp legend
      ctx.fillStyle = cT;
      ctx.fillRect(W - 180, legendY - 6, 18, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`Temp Sensor ${sid}`, W - 155, legendY);
      legendY += 16;
      // humidity legend
      ctx.fillStyle = cH;
      ctx.fillRect(W - 180, legendY - 6, 18, 3);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`Hum Sensor ${sid}`, W - 155, legendY);
      legendY += 16;
    });
    
    // Si hay un punto hovered, dibujar línea vertical de referencia
    if (hoveredPoint) {
      const arr = seriesMap.get(hoveredPoint.key) || [];
      if (arr.length > 0) {
        const x = (hoveredPoint.index / (finalMaxPoints - 1)) * (W - 40) + 20;
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
    
    // Buscar en todas las series (temperatura y humedad)
    seriesMap.forEach((arr, key) => {
      arr.forEach((p, i) => {
        const x = (i / (finalMaxPoints - 1)) * (W - 40) + 20;
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
    const now = Date.now();
    // Solo renderizar si ha pasado el intervalo mínimo configurado o hay hover activo
    if ((dirty && (now - lastRenderTime >= chartRefreshInterval)) || hoveredPoint) {
      draw();
      if (!hoveredPoint) lastRenderTime = now;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  
  // Listener para cambios en la configuración de visualización
  let configUnsubscribe = null;
  try {
    configUnsubscribe = configService.onConfigChange('visualization_config', (newConfig) => {
      if (newConfig && newConfig.chartRefresh) {
        const newInterval = Math.max(newConfig.chartRefresh, 15000);
        if (newInterval !== chartRefreshInterval) {
          console.log(`[TemperatureChart] Actualizando intervalo de renderizado: ${chartRefreshInterval}ms → ${newInterval}ms`);
          // Actualizar el intervalo dinámicamente
          chartRefreshInterval = newInterval;
          // Forzar un renderizado inmediato con el nuevo intervalo
          lastRenderTime = 0; // Permitir renderizado inmediato
          dirty = true; // Marcar como sucio para forzar renderizado
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
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return root;
}
