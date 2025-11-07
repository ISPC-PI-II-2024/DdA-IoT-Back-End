// ==========================
// Componentes UI Reutilizables (Hook-style)
// Similar a hooks de React pero para Vanilla JS
// ==========================

import { el } from "./dom.js";

/**
 * Hook para crear botones con estilos consistentes
 */
export function createButton({
  text = "",
  variant = "primary", // primary, secondary, success, danger, outline
  size = "medium", // small, medium, large
  icon = null,
  onclick = null,
  disabled = false,
  fullWidth = false,
  class: additionalClass = "",
  style: additionalStyle = ""
} = {}) {
  const sizeClasses = {
    small: "btn-sm",
    medium: "",
    large: "btn-lg"
  };
  
  const variantClasses = {
    primary: "",
    secondary: "btn-secondary",
    success: "btn-success",
    danger: "btn-danger",
    outline: "btn-outline"
  };
  
  const classes = [
    "btn",
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? "btn-full" : "",
    additionalClass
  ].filter(Boolean).join(" ");
  
  const button = el("button", {
    class: classes,
    disabled,
    onclick,
    style: additionalStyle
  });
  
  if (icon) {
    button.appendChild(el("span", {}, icon));
  }
  
  if (text) {
    if (typeof document !== 'undefined' && document.createTextNode) {
      button.appendChild(document.createTextNode(text));
    } else {
      button.textContent = text;
    }
  }
  
  return button;
}

/**
 * Hook para crear cards con estilos consistentes
 */
export function createCard({
  title = null,
  subtitle = null,
  content = null,
  footer = null,
  class: additionalClass = "",
  style: additionalStyle = "",
  compact = false,
  interactive = false
} = {}) {
  const cardClasses = [
    "card",
    compact ? "card-compact" : "",
    interactive ? "card-interactive" : "",
    additionalClass
  ].filter(Boolean).join(" ");
  
  const children = [];
  
  if (title) {
    children.push(
      el("h3", {
        class: compact ? "text-lg font-semibold mb-2" : "",
        style: compact ? "" : "margin-bottom: 15px;"
      }, title)
    );
  }
  
  if (subtitle) {
    children.push(
      el("p", {
        class: "text-sm text-muted",
        style: "margin-bottom: 10px; color: var(--color-texto-secundario);"
      }, subtitle)
    );
  }
  
  if (content) {
    const contentElement = typeof content === "string" 
      ? el("div", {}, content)
      : content;
    children.push(contentElement);
  }
  
  if (footer) {
    const footerElement = typeof footer === "string"
      ? el("div", { class: "card-footer", style: "margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--color-borde);" }, footer)
      : footer;
    children.push(footerElement);
  }
  
  return el("div", {
    class: cardClasses,
    style: additionalStyle
  }, ...children);
}

/**
 * Hook para crear inputs con estilos consistentes
 */
export function createInput({
  type = "text",
  id = null,
  name = null,
  placeholder = "",
  value = "",
  label = null,
  required = false,
  disabled = false,
  class: additionalClass = "",
  style: additionalStyle = "",
  onChange = null,
  onInput = null
} = {}) {
  const input = el("input", {
    type,
    id,
    name,
    placeholder,
    value,
    required,
    disabled,
    class: additionalClass,
    style: additionalStyle,
    onchange: onChange,
    oninput: onInput
  });
  
  if (label) {
    return el("div", { class: "form-group" },
      el("label", {
        for: id,
        style: "display: block; margin-bottom: 5px; font-weight: 600; color: var(--color-texto);"
      }, label),
      input
    );
  }
  
  return input;
}

/**
 * Hook para crear dialogs/modales reutilizables
 */
export function createDialog({
  title = "",
  content = null,
  buttons = [],
  onClose = null,
  class: additionalClass = "",
  style: additionalStyle = ""
} = {}) {
  const overlay = el("div", {
    class: "dialog-overlay",
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
      animation: fadeIn 0.2s ease;
    `
  });
  
  const dialogContent = el("div", {
    class: `dialog-content ${additionalClass}`,
    style: `
      background: #ffffff;
      border: 1px solid #0284c7;
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      ${additionalStyle}
    `
  });
  
  if (title) {
    dialogContent.appendChild(
      el("h3", {
        style: "color: #333; margin-bottom: 15px; font-size: 1.1rem; font-weight: 600;"
      }, title)
    );
  }
  
  if (content) {
    const contentElement = typeof content === "string"
      ? el("div", { style: "margin-bottom: 15px;" }, content)
      : content;
    dialogContent.appendChild(contentElement);
  }
  
  if (buttons.length > 0) {
    const buttonsContainer = el("div", {
      style: "display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;"
    });
    
    buttons.forEach(btnConfig => {
      const button = createButton({
        text: btnConfig.text,
        variant: btnConfig.variant || "primary",
        size: btnConfig.size || "medium",
        onclick: () => {
          if (btnConfig.onClick) {
            btnConfig.onClick();
          }
          if (btnConfig.close !== false) {
            closeDialog();
          }
        }
      });
      buttonsContainer.appendChild(button);
    });
    
    dialogContent.appendChild(buttonsContainer);
  }
  
  const closeDialog = () => {
    overlay.style.animation = "fadeOut 0.2s ease";
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      if (onClose) onClose();
    }, 200);
  };
  
  // Cerrar al hacer clic fuera
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });
  
  overlay.appendChild(dialogContent);
  
  // Solo agregar al DOM si está disponible
  if (typeof document !== 'undefined' && document.body) {
    document.body.appendChild(overlay);
    
    // Agregar animaciones CSS si no existen
    if (!document.getElementById("dialog-animations")) {
      const style = document.createElement("style");
      style.id = "dialog-animations";
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  return { overlay, closeDialog };
}

/**
 * Hook para crear un sistema de filtros de tiempo reutilizable
 */
export function createTimeRangeFilter({
  storageKey = "time_range",
  defaultRange = "1h",
  onRangeChange = null,
  class: additionalClass = "",
  style: additionalStyle = ""
} = {}) {
  let timeRange = {
    type: 'quick',
    value: defaultRange,
    from: null,
    to: null
  };
  
  // Cargar desde localStorage
  function loadTimeRangeFromStorage() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedRange = JSON.parse(saved);
        timeRange = { ...timeRange, ...savedRange };
      }
    } catch (error) {
      console.warn('[TimeRangeFilter] Error cargando rango:', error);
    }
  }
  
  // Guardar en localStorage
  function saveTimeRangeToStorage() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(timeRange));
    } catch (error) {
      console.warn('[TimeRangeFilter] Error guardando rango:', error);
    }
  }
  
  // Calcular rango actual
  function getCurrentTimeRange() {
    const now = Date.now();
    let from, to = now;
    
    if (timeRange.type === 'quick') {
      const hours = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168
      };
      const hoursBack = hours[timeRange.value] || 1;
      from = now - (hoursBack * 60 * 60 * 1000);
    } else if (timeRange.type === 'custom') {
      from = timeRange.from ? new Date(timeRange.from).getTime() : now - (60 * 60 * 1000);
      to = timeRange.to ? new Date(timeRange.to).getTime() : now;
    } else {
      from = now - (60 * 60 * 1000);
    }
    
    return { from, to };
  }
  
  // Formatear tiempo
  function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month} ${hours}:${minutes}`;
  }
  
  // Crear controles UI
  const container = el("div", {
    class: `time-range-controls ${additionalClass}`,
    style: `
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px;
      background: #2a3f5f;
      border-radius: 6px;
      flex-wrap: wrap;
      align-items: center;
      ${additionalStyle}
    `
  });
  
  const quickTimeButtons = ['1h', '6h', '24h', '7d'];
  const buttonLabels = {
    '1h': 'Última hora',
    '6h': 'Últimas 6h',
    '24h': 'Últimas 24h',
    '7d': 'Última semana'
  };
  
  quickTimeButtons.forEach(btnValue => {
    const btn = createButton({
      text: buttonLabels[btnValue],
      variant: timeRange.type === 'quick' && timeRange.value === btnValue ? 'primary' : 'secondary',
      size: 'small',
      onclick: () => {
        timeRange.type = 'quick';
        timeRange.value = btnValue;
        saveTimeRangeToStorage();
        updateButtons();
        updateIndicator();
        if (onRangeChange) onRangeChange(getCurrentTimeRange());
      }
    });
    btn.classList.add('time-range-btn');
    btn.dataset.rangeValue = btnValue;
    container.appendChild(btn);
  });
  
  const customBtn = createButton({
    text: "📅 Personalizado",
    variant: timeRange.type === 'custom' ? 'primary' : 'secondary',
    size: 'small',
    onclick: () => {
      showCustomTimeRangeDialog();
    }
  });
  customBtn.classList.add('time-range-btn');
  container.appendChild(customBtn);
  
  const indicator = el("div", {
    class: "time-range-indicator",
    style: `
      margin-left: auto;
      font-size: 0.8rem;
      color: #9aa4b2;
      font-weight: 500;
    `
  });
  
  function updateIndicator() {
    const { from, to } = getCurrentTimeRange();
    indicator.textContent = `${formatTime(new Date(from))} - ${formatTime(new Date(to))}`;
  }
  
  function updateButtons() {
    container.querySelectorAll('.time-range-btn').forEach(btn => {
      const rangeValue = btn.dataset.rangeValue;
      if (rangeValue) {
        const isActive = timeRange.type === 'quick' && timeRange.value === rangeValue;
        btn.className = `btn btn-sm time-range-btn ${isActive ? 'btn-primary' : 'btn-secondary'}`;
      } else {
        const isActive = timeRange.type === 'custom';
        btn.className = `btn btn-sm time-range-btn ${isActive ? 'btn-primary' : 'btn-secondary'}`;
      }
    });
  }
  
  function showCustomTimeRangeDialog() {
    const { from, to } = getCurrentTimeRange();
    const fromValue = timeRange.from ? new Date(timeRange.from).toISOString().slice(0, 16) : new Date(from).toISOString().slice(0, 16);
    const toValue = timeRange.to ? new Date(timeRange.to).toISOString().slice(0, 16) : new Date(to).toISOString().slice(0, 16);
    
    const fromInput = createInput({
      type: "datetime-local",
      id: `${storageKey}-from`,
      label: "Desde:",
      value: fromValue
    });
    
    const toInput = createInput({
      type: "datetime-local",
      id: `${storageKey}-to`,
      label: "Hasta:",
      value: toValue
    });
    
    const { closeDialog } = createDialog({
      title: "Seleccionar Rango Personalizado",
      content: el("div", {
        style: "display: flex; flex-direction: column; gap: 12px;"
      },
        fromInput,
        toInput
      ),
      buttons: [
        {
          text: "Aplicar",
          variant: "primary",
          onClick: () => {
            const fromInputEl = document.getElementById(`${storageKey}-from`);
            const toInputEl = document.getElementById(`${storageKey}-to`);
            if (fromInputEl && toInputEl) {
              timeRange.type = 'custom';
              timeRange.from = new Date(fromInputEl.value).toISOString();
              timeRange.to = new Date(toInputEl.value).toISOString();
              saveTimeRangeToStorage();
              updateButtons();
              updateIndicator();
              if (onRangeChange) onRangeChange(getCurrentTimeRange());
            }
          }
        },
        {
          text: "Cancelar",
          variant: "secondary"
        }
      ]
    });
  }
  
  container.appendChild(indicator);
  
  // Inicializar
  loadTimeRangeFromStorage();
  updateButtons();
  updateIndicator();
  
  return {
    container,
    getCurrentTimeRange,
    setRange: (range) => {
      timeRange = { ...timeRange, ...range };
      saveTimeRangeToStorage();
      updateButtons();
      updateIndicator();
      if (onRangeChange) onRangeChange(getCurrentTimeRange());
    },
    getRange: () => ({ ...timeRange })
  };
}

/**
 * Utilidades para formateo de valores
 */
export const formatters = {
  temperature: (value, unit = 'celsius') => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    const converted = unit === 'fahrenheit' ? (num * 9/5) + 32 : num;
    const symbol = unit === 'fahrenheit' ? '°F' : '°C';
    return `${converted.toFixed(1)}${symbol}`;
  },
  
  humidity: (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    return `${num.toFixed(1)}%`;
  },
  
  co2: (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    return `${Math.round(num)}ppm`;
  },
  
  battery: (value) => {
    if (value === null || value === undefined) return 'N/A';
    const num = parseFloat(value);
    if (isNaN(num)) return String(value);
    return `${num.toFixed(1)}%`;
  },
  
  dateTime: (date, format = 'short') => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    
    if (format === 'short') {
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (format === 'long') {
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else if (format === 'time') {
      return d.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return d.toLocaleString();
  },
  
  dateRange: (from, to) => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const formatTime = (date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month} ${hours}:${minutes}`;
    };
    return `${formatTime(fromDate)} - ${formatTime(toDate)}`;
  }
};

/**
 * Utilidades para colores de severidad (centralizado)
 */
export const severityColors = {
  critical: {
    bg: '#fee2e2',
    border: '#dc2626',
    text: '#991b1b',
    icon: '🔴'
  },
  warning: {
    bg: '#fef3c7',
    border: '#f59e0b',
    text: '#92400e',
    icon: '🟡'
  },
  info: {
    bg: '#dbeafe',
    border: '#0284c7',
    text: '#075985',
    icon: '🔵'
  },
  success: {
    bg: '#d1fae5',
    border: '#059669',
    text: '#065f46',
    icon: '✅'
  }
};

/**
 * Hook para crear alert cards reutilizables
 */
export function createAlertCard(alert, options = {}) {
  const {
    showSeverity = true,
    showTimestamp = true,
    showDeviceInfo = true,
    compact = false
  } = options;
  
  const severity = alert.severity || 'warning';
  const colors = severityColors[severity] || severityColors.warning;
  
  const sensorInfo = {
    sensorId: alert.sensorId || alert.sensor_id || alert.id,
    deviceId: alert.deviceId || alert.device_id || alert.gateway_id,
    deviceType: alert.deviceType || alert.device_type,
    endpointId: alert.endpointId || alert.endpoint_id
  };
  
  const deviceTypeLabels = {
    sensor: '🌡️ Sensor',
    endpoint: '🔌 Endpoint',
    gateway: '📡 Gateway'
  };
  
  return el("div", {
    class: "alert-card",
    style: `
      padding: ${compact ? '8px' : '10px'};
      margin-bottom: 8px;
      border-left: 4px solid ${colors.border};
      background: ${colors.bg};
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 10px;
    `
  },
    el("span", {
      style: `font-size: ${compact ? '1rem' : '1.2rem'};`
    }, colors.icon),
    el("div", {
      style: "flex: 1;"
    },
      el("div", {
        style: "font-weight: 600; color: var(--color-texto); margin-bottom: 4px;"
      }, alert.message),
      showTimestamp && el("div", {
        style: "font-size: 0.8rem; color: var(--color-texto-secundario);"
      }, formatters.dateTime(alert.timestamp)),
      showSeverity && el("div", {
        style: `font-size: 0.75rem; color: ${colors.border}; margin-top: 4px; font-weight: 600;`
      }, severity === 'critical' ? 'CRÍTICO' : severity === 'warning' ? 'ADVERTENCIA' : 'INFO'),
      showDeviceInfo && sensorInfo.deviceId && el("div", {
        style: "font-size: 0.75rem; color: var(--color-texto-secundario); margin-top: 4px;"
      }, `${deviceTypeLabels[sensorInfo.deviceType] || 'Dispositivo'} ${sensorInfo.deviceId}`)
    )
  );
}

/**
 * Hook para crear loading skeletons
 */
export function createSkeleton({
  type = "text", // text, card, button, input
  width = "100%",
  height = "20px",
  lines = 1
} = {}) {
  const skeleton = el("div", {
    class: "skeleton",
    style: `
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
      width: ${width};
      height: ${height};
    `
  });
  
  if (type === "text" && lines > 1) {
    const container = el("div", {
      style: "display: flex; flex-direction: column; gap: 8px;"
    });
    for (let i = 0; i < lines; i++) {
      container.appendChild(createSkeleton({ type: "text", width, height }));
    }
    return container;
  }
  
  if (type === "card") {
    return createCard({
      content: el("div", {
        style: "display: flex; flex-direction: column; gap: 12px;"
      },
        createSkeleton({ type: "text", width: "60%", height: "24px" }),
        createSkeleton({ type: "text", width: "100%", height: "16px" }),
        createSkeleton({ type: "text", width: "80%", height: "16px" })
      )
    });
  }
  
  return skeleton;
}

/**
 * Utilidades para colores de estado de dispositivos
 */
export const deviceStatusColors = {
  online: '#4CAF50',
  offline: '#d32f2f',
  'en_linea': '#4CAF50',
  'fuera_de_linea': '#d32f2f',
  ok: '#4CAF50',
  error: '#dc2626',
  warning: '#f59e0b',
  battery_low: '#FF9800'
};

/**
 * Hook para crear indicadores LED de estado
 */
export function createLEDIndicator({
  status = 'ok', // ok, warning, error, critical, online, offline
  size = 'medium', // small, medium, large
  pulse = true,
  class: additionalClass = ""
} = {}) {
  const sizes = {
    small: '8px',
    medium: '12px',
    large: '16px'
  };
  
  const statusClass = status === 'online' || status === 'en_linea' || status === 'ok' 
    ? 'led-ok' 
    : status === 'warning' || status === 'battery_low'
    ? 'led-warning'
    : status === 'critical' || status === 'error' || status === 'offline' || status === 'fuera_de_linea'
    ? 'led-error'
    : 'led-ok';
  
  const color = deviceStatusColors[status] || deviceStatusColors.ok;
  
  return el("div", {
    class: `led-indicator ${statusClass} ${additionalClass}`,
    style: `
      width: ${sizes[size]};
      height: ${sizes[size]};
      border-radius: 50%;
      display: inline-block;
      margin-left: 8px;
      background-color: ${color};
      box-shadow: 0 0 8px ${color}40;
      ${pulse ? 'animation: led-pulse 2s infinite;' : ''}
    `
  });
}

/**
 * Hook para crear indicadores de estado de dispositivo
 */
export function createStatusIndicator({
  status = 'ok',
  text = null,
  showLED = true,
  showText = true
} = {}) {
  const statusText = {
    'ok': 'OK',
    'online': 'En línea',
    'en_linea': 'En línea',
    'offline': 'Fuera de línea',
    'fuera_de_linea': 'Fuera de línea',
    'warning': 'Advertencia',
    'error': 'Error',
    'critical': 'Crítico',
    'battery_low': 'Batería baja'
  };
  
  const displayText = text || statusText[status] || status;
  
  const statusClass = status === 'online' || status === 'en_linea' ? 'status-online' : 'status-offline';
  const container = el("span", {
    class: `status-indicator ${statusClass}`,
    style: "display: inline-flex; align-items: center; gap: 6px;"
  });
  
  if (showLED) {
    const led = createLEDIndicator({ status });
    if (led) container.appendChild(led);
  }
  
  if (showText) {
    if (typeof document !== 'undefined' && document.createTextNode) {
      container.appendChild(document.createTextNode(displayText));
    } else {
      // Fallback si document no está disponible
      container.textContent = displayText;
    }
  }
  
  return container;
}

/**
 * Hook para obtener color de estado según valor
 */
export function getStatusColor(status) {
  return deviceStatusColors[status] || deviceStatusColors.ok;
}

/**
 * Hook para crear stat cards reutilizables
 */
export function createStatCard({
  title = "",
  value = 0,
  total = 0,
  unit = "",
  status = null, // Si es null, se calcula automáticamente
  icon = null
} = {}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const calculatedStatus = status || (percentage === 100 ? "ok" : percentage > 50 ? "warning" : "critical");
  
  return el("div", {
    class: `stat-card stat-card-${calculatedStatus}`,
    style: `
      background: var(--color-blanco);
      border: 1px solid var(--color-borde);
      border-left: 3px solid ${getStatusColor(calculatedStatus)};
      border-radius: var(--radius-sm);
      padding: var(--espaciado-sm);
      text-align: center;
      transition: all 0.2s ease;
    `
  },
    el("div", { class: "stat-header" },
      el("h5", { style: "margin: 0; font-size: 0.9rem; font-weight: 600;" }, icon ? `${icon} ${title}` : title),
      createLEDIndicator({ status: calculatedStatus })
    ),
    el("div", { class: "stat-numbers", style: "margin: 8px 0; font-size: 1.2rem; font-weight: 700;" },
      el("span", { class: "stat-value", style: `color: ${getStatusColor(calculatedStatus)};` }, value),
      unit && el("span", { style: "font-size: 0.8rem; margin-left: 4px;" }, unit),
      total > 0 && el("span", { style: "margin: 0 4px; opacity: 0.6;" }, "/"),
      total > 0 && el("span", { class: "stat-total", style: "opacity: 0.6;" }, total)
    ),
    total > 0 && el("div", { class: "stat-percentage", style: "font-size: 0.85rem; color: var(--color-texto-secundario);" }, `${percentage}%`)
  );
}

/**
 * Hook para crear list items con información de dispositivo
 */
export function createDeviceListItem({
  device = {},
  showStatus = true,
  showDetails = true,
  onClick = null
} = {}) {
  const statusColor = getStatusColor(device.estado || device.status);
  const deviceType = device.tipo || device.type || 'device';
  const deviceTypeLabels = {
    sensor: '🌡️ Sensor',
    endpoint: '🔌 Endpoint',
    gateway: '📡 Gateway',
    device: '📱 Dispositivo'
  };
  
  const item = el("li", {
    class: onClick ? "device-list-item interactive" : "device-list-item",
    style: `
      padding: 12px;
      margin-bottom: 8px;
      border: 1px solid var(--color-borde);
      border-left: 3px solid ${statusColor};
      border-radius: 4px;
      background: var(--color-blanco);
      ${onClick ? 'cursor: pointer; transition: all 0.2s;' : ''}
    `,
    onclick: onClick
  },
    el("div", {
      style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"
    },
      el("div", {
        style: "display: flex; align-items: center; gap: 8px;"
      },
        el("span", { style: "font-size: 1.2rem;" }, deviceTypeLabels[deviceType] || '📱'),
        el("span", {
          style: "font-weight: 600; color: var(--color-texto);"
        }, device.nombre || device.name || `Dispositivo ${device.id_dispositivo || device.id}`),
        showStatus && createStatusIndicator({
          status: device.estado || device.status,
          showText: false
        })
      ),
      showStatus && createStatusIndicator({
        status: device.estado || device.status,
        showLED: false
      })
    )
  );
  
  if (showDetails) {
    const details = el("div", {
      style: "font-size: 0.85rem; color: var(--color-texto-secundario); display: flex; flex-wrap: wrap; gap: 12px;"
    });
    
    if (device.tipo) {
      details.appendChild(el("span", {}, `Tipo: ${deviceTypeLabels[deviceType] || device.tipo}`));
    }
    if (device.id_dispositivo || device.id) {
      details.appendChild(el("span", {}, `ID: ${device.id_dispositivo || device.id}`));
    }
    if (device.ultima_conexion) {
      details.appendChild(el("span", {}, `Última conexión: ${formatters.dateTime(device.ultima_conexion, 'short')}`));
    }
    
    if (details.children.length > 0) {
      item.appendChild(details);
    }
  }
  
  if (onClick) {
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'translateX(4px)';
      item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.transform = '';
      item.style.boxShadow = '';
    });
  }
  
  return item;
}

// Función helper para inicializar estilos CSS (se ejecuta solo cuando se necesita)
function initializeStyles() {
  if (typeof document === 'undefined') return;
  
  try {
    // Skeleton animations
    if (!document.getElementById('skeleton-animations')) {
      const style = document.createElement('style');
      style.id = 'skeleton-animations';
      style.textContent = `
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        @keyframes led-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `;
      if (document.head) {
        document.head.appendChild(style);
      } else if (document.body) {
        document.body.appendChild(style);
      }
    }
  } catch (error) {
    // Silenciar error para evitar problemas durante la importación
  }
}

// Inicializar estilos de forma lazy (solo cuando se necesite)
// Usar requestAnimationFrame para asegurar que el DOM esté listo
if (typeof window !== 'undefined') {
  const initStyles = () => {
    try {
      if (typeof document !== 'undefined' && document.readyState !== 'loading') {
        initializeStyles();
      } else if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', initializeStyles, { once: true });
      }
    } catch (error) {
      // Silenciar error
    }
  };
  
  // Usar requestAnimationFrame para diferir la ejecución
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      setTimeout(initStyles, 0);
    });
  } else {
    setTimeout(initStyles, 100);
  }
}

