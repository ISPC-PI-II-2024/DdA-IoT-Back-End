import { el } from "../utils/dom.js";
import { rtClient } from "../ws.js";

export function mqttLogsWidget() {
  let logsContainer = el("div", { class: "mqtt-logs-container" });
  let logsList = el("div", { class: "logs-list" });
  let logsHeader = el("div", { class: "logs-header" });
  let logsContent = el("div", { class: "logs-content" });
  let logsFooter = el("div", { class: "logs-footer" });
  
  let logs = [];
  const maxLogs = 50; // Máximo número de logs a mostrar
  let isAutoScroll = true;
  let isExpanded = false;

  // Crear el header con controles
  logsHeader.innerHTML = `
    <div class="logs-title">
      <h4>📡 Logs MQTT en Tiempo Real</h4>
      <div class="logs-controls">
        <button id="toggle-expand" class="btn-icon" title="Expandir/Contraer">
          <span class="icon">📋</span>
        </button>
        <button id="clear-logs" class="btn-icon" title="Limpiar logs">
          <span class="icon">🗑️</span>
        </button>
        <button id="toggle-autoscroll" class="btn-icon ${isAutoScroll ? 'active' : ''}" title="Auto-scroll">
          <span class="icon">📜</span>
        </button>
      </div>
    </div>
    <div class="logs-stats">
      <span id="logs-count">0 mensajes</span>
      <span id="logs-status" class="status-indicator">●</span>
    </div>
  `;

  // Crear el contenido de logs
  logsContent.appendChild(logsList);

  // Crear el footer con información
  logsFooter.innerHTML = `
    <div class="logs-info">
      <span>Mostrando últimos ${maxLogs} mensajes</span>
      <span class="logs-timestamp" id="last-update">—</span>
    </div>
  `;

  // Ensamblar el contenedor
  logsContainer.appendChild(logsHeader);
  logsContainer.appendChild(logsContent);
  logsContainer.appendChild(logsFooter);

  // Función para agregar un nuevo log
  const addLog = (logData) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      topic: logData.topic || 'unknown',
      data: logData.data || logData,
      type: logData.type || 'message',
      raw: logData.raw || logData
    };

    logs.unshift(logEntry); // Agregar al inicio

    // Mantener solo los últimos maxLogs
    if (logs.length > maxLogs) {
      logs = logs.slice(0, maxLogs);
    }

    renderLogs();
    updateStats();
  };

  // Función para renderizar los logs
  const renderLogs = () => {
    logsList.innerHTML = '';
    
    logs.forEach(log => {
      const logElement = createLogElement(log);
      logsList.appendChild(logElement);
    });

    // Auto-scroll si está habilitado
    if (isAutoScroll) {
      logsList.scrollTop = 0;
    }
  };

  // Función para crear un elemento de log
  const createLogElement = (log) => {
    const logElement = el("div", { class: `log-entry log-${log.type}` },
      el("div", { class: "log-header" },
        el("span", { class: "log-timestamp" }, log.timestamp),
        el("span", { class: "log-topic" }, log.topic),
        el("span", { class: `log-type log-type-${log.type}` }, getTypeLabel(log.type))
      ),
      el("div", { class: "log-content" },
        el("pre", { class: "log-data" }, formatLogData(log.data))
      )
    );

    return logElement;
  };

  // Función para formatear los datos del log
  const formatLogData = (data) => {
    if (typeof data === 'string') {
      return data;
    }
    
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  };

  // Función para obtener la etiqueta del tipo
  const getTypeLabel = (type) => {
    const labels = {
      'gateway_update': 'Gateway',
      'endpoint_update': 'Endpoint', 
      'sensor_update': 'Sensor',
      'temperature': 'Temp',
      'co2': 'CO2',
      'humidity': 'Hum',
      'pressure': 'Pres',
      'commands': 'Cmd',
      'connection': 'Conn',
      'message': 'Msg',
      'error': 'Error',
      'warning': 'Warn'
    };
    return labels[type] || type;
  };

  // Función para actualizar estadísticas
  const updateStats = () => {
    const countElement = logsContainer.querySelector('#logs-count');
    const statusElement = logsContainer.querySelector('#logs-status');
    const lastUpdateElement = logsContainer.querySelector('#last-update');
    
    if (countElement) {
      countElement.textContent = `${logs.length} mensajes`;
    }
    
    if (statusElement) {
      statusElement.className = `status-indicator ${logs.length > 0 ? 'active' : 'inactive'}`;
    }
    
    if (lastUpdateElement && logs.length > 0) {
      lastUpdateElement.textContent = logs[0].timestamp;
    }
  };

  // Función para limpiar logs
  const clearLogs = () => {
    logs = [];
    renderLogs();
    updateStats();
  };

  // Función para alternar auto-scroll
  const toggleAutoScroll = () => {
    isAutoScroll = !isAutoScroll;
    const button = logsContainer.querySelector('#toggle-autoscroll');
    if (button) {
      button.classList.toggle('active', isAutoScroll);
    }
  };

  // Función para alternar expansión
  const toggleExpansion = () => {
    isExpanded = !isExpanded;
    logsContainer.classList.toggle('expanded', isExpanded);
    const button = logsContainer.querySelector('#toggle-expand');
    if (button) {
      const icon = button.querySelector('.icon');
      icon.textContent = isExpanded ? '📄' : '📋';
    }
  };

  // Event listeners para los controles
  logsContainer.addEventListener('click', (e) => {
    if (e.target.closest('#clear-logs')) {
      clearLogs();
    } else if (e.target.closest('#toggle-autoscroll')) {
      toggleAutoScroll();
    } else if (e.target.closest('#toggle-expand')) {
      toggleExpansion();
    }
  });

  // Suscribirse a todos los tipos de mensajes MQTT
  const subscribeToMQTTLogs = () => {
    // Suscribirse a mensajes de gateway
    rtClient.subscribe("gateway/gateway", (msg) => {
      addLog({
        topic: "gateway/gateway",
        type: "gateway_update",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de endpoint
    rtClient.subscribe("gateway/endpoint", (msg) => {
      addLog({
        topic: "gateway/endpoint", 
        type: "endpoint_update",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de sensor
    rtClient.subscribe("gateway/sensor", (msg) => {
      addLog({
        topic: "gateway/sensor",
        type: "sensor_update", 
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de temperatura (compatibilidad)
    rtClient.subscribe("temperature", (msg) => {
      addLog({
        topic: "temperature",
        type: "temperature",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de CO2
    rtClient.subscribe("co2", (msg) => {
      addLog({
        topic: "co2",
        type: "co2", 
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes generales
    rtClient.subscribe("message", (msg) => {
      addLog({
        topic: msg.topic || "general",
        type: "message",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de error
    rtClient.subscribe("error", (msg) => {
      addLog({
        topic: "error",
        type: "error",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de warning
    rtClient.subscribe("warning", (msg) => {
      addLog({
        topic: "warning",
        type: "warning",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de humedad
    rtClient.subscribe("humidity", (msg) => {
      addLog({
        topic: "humidity",
        type: "humidity",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de presión
    rtClient.subscribe("pressure", (msg) => {
      addLog({
        topic: "pressure",
        type: "pressure",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de comandos
    rtClient.subscribe("commands", (msg) => {
      addLog({
        topic: "commands",
        type: "commands",
        data: msg.data,
        raw: msg
      });
    });

    // Suscribirse a mensajes de estado de conexión
    rtClient.subscribe("connection", (msg) => {
      addLog({
        topic: "connection",
        type: "connection",
        data: msg.data,
        raw: msg
      });
    });
  };

  // Inicializar suscripciones
  subscribeToMQTTLogs();

  // Renderizar inicialmente
  renderLogs();
  updateStats();

  return logsContainer;
}
