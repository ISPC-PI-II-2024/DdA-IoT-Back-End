// ==========================
// Componente SVG Interactivo para Visualización de Dispositivos
// Muestra un dispositivo con sus sensores como puntos interactivos
// ==========================
import { el } from "../utils/dom.js";
import { DevicesAPI } from "../api.js";

export async function deviceVisualizationWidget(device) {
  if (!device) {
    return el("div", { class: "card" },
      el("div", { style: "text-align: center; padding: 40px; color: #666;" },
        el("h3", {}, "Visualización de Dispositivo"),
        el("p", {}, "Selecciona un dispositivo para ver su visualización")
      )
    );
  }

  return await createDeviceVisualization(device);
}

// Función para crear la visualización del dispositivo
export async function createDeviceVisualization(device) {

  // Obtener datos de sensores del dispositivo
  let sensorData = [];
  try {
    const response = await DevicesAPI.getDeviceSensorData(device.id_dispositivo, 50);
    if (response.success && response.data.length > 0) {
      // Agrupar datos por tipo de sensor y obtener el más reciente
      const sensorGroups = {};
      response.data.forEach(data => {
        if (!sensorGroups[data.tipo_sensor] || new Date(data.timestamp) > new Date(sensorGroups[data.tipo_sensor].timestamp)) {
          sensorGroups[data.tipo_sensor] = data;
        }
      });
      sensorData = Object.values(sensorGroups);
    }
  } catch (error) {
    console.error('Error obteniendo datos de sensores:', error);
  }

  // Función para determinar el estado de un sensor
  function getSensorStatus(sensor) {
    const value = parseFloat(sensor.valor);
    const thresholds = {
      'temperatura': { min: 0, max: 50 },
      'humedad': { min: 20, max: 80 },
      'co2': { min: 300, max: 1000 },
      'pm25': { min: 0, max: 25 },
      'presion': { min: 900, max: 1100 },
      'luminosidad': { min: 0, max: 10000 },
      'vibracion': { min: 0, max: 2 },
      'sonido': { min: 0, max: 100 }
    };

    const threshold = thresholds[sensor.tipo_sensor];
    if (!threshold) return 'normal';

    if (value < threshold.min || value > threshold.max) {
      return 'alert';
    } else if (value < (threshold.min + (threshold.max - threshold.min) * 0.1) || 
               value > (threshold.max - (threshold.max - threshold.min) * 0.1)) {
      return 'warning';
    }
    return 'normal';
  }

  // Función para obtener el color según el estado
  function getStatusColor(status) {
    switch (status) {
      case 'alert': return '#F44336';
      case 'warning': return '#FF9800';
      default: return '#4CAF50';
    }
  }

  // Función para obtener la posición del sensor en el SVG
  function getSensorPosition(index, total) {
    const positions = [
      { x: 200, y: 200, label: 'T' }, // Superior
      { x: 200, y: 300, label: 'H' }, // Medio-superior
      { x: 200, y: 400, label: 'M' }, // Medio
      { x: 200, y: 500, label: 'B' }, // Inferior
      { x: 120, y: 350, label: 'L' }, // Lateral izquierdo
      { x: 280, y: 350, label: 'R' }, // Lateral derecho
      { x: 200, y: 250, label: 'C' }, // Centro-superior
      { x: 200, y: 450, label: 'D' }  // Centro-inferior
    ];
    return positions[index % positions.length];
  }

  // Crear el contenedor principal
  const container = el("div", {
    class: "card",
    style: "position: relative; overflow: hidden;"
  });

  // Crear el SVG
  const svg = el("svg", {
    viewBox: "0 0 400 600",
    style: "width: 100%; height: 400px; max-width: 600px; margin: 0 auto;",
    xmlns: "http://www.w3.org/2000/svg"
  });

  // Base del dispositivo (adaptable según tipo)
  const deviceBase = el("rect", {
    x: "150",
    y: "500",
    width: "100",
    height: "50",
    fill: "#8B4513",
    stroke: "#5D4037",
    "stroke-width": "2"
  });

  // Cuerpo del dispositivo (cilíndrico como silo)
  const deviceBody = el("ellipse", {
    cx: "200",
    cy: "350",
    rx: "120",
    ry: "180",
    fill: "#E0E0E0",
    stroke: "#BDBDBD",
    "stroke-width": "3"
  });

  // Techo del dispositivo
  const deviceTop = el("path", {
    d: "M80 350 L200 150 L320 350 Z",
    fill: "#9E9E9E",
    stroke: "#757575",
    "stroke-width": "2"
  });

  // Escalera de acceso
  const ladder = el("polyline", {
    points: "280 500, 280 250, 290 250, 290 500",
    stroke: "#616161",
    "stroke-width": "4",
    fill: "none"
  });

  // Agregar elementos base al SVG
  svg.appendChild(deviceBase);
  svg.appendChild(deviceBody);
  svg.appendChild(deviceTop);
  svg.appendChild(ladder);

  // Crear sensores como círculos interactivos
  sensorData.forEach((sensor, index) => {
    const position = getSensorPosition(index, sensorData.length);
    const status = getSensorStatus(sensor);
    const color = getStatusColor(status);
    
    // Círculo del sensor
    const sensorCircle = el("circle", {
      class: "sensor-point",
      cx: position.x,
      cy: position.y,
      r: "8",
      fill: color,
      stroke: "#fff",
      "stroke-width": "2",
      style: `
        cursor: pointer;
        transition: all 0.3s ease;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ${status === 'alert' ? 'animation: pulse 2s infinite;' : ''}
      `,
      "data-sensor": sensor.tipo_sensor,
      "data-value": sensor.valor,
      "data-unit": sensor.unidad || '',
      "data-timestamp": sensor.timestamp,
      "data-status": status,
      title: `${sensor.tipo_sensor}: ${sensor.valor}${sensor.unidad || ''}`
    });

    // Etiqueta del sensor
    const sensorLabel = el("text", {
      x: position.x + 12,
      y: position.y + 4,
      "font-size": "12",
      fill: "#333",
      "font-family": "Arial, sans-serif"
    }, position.label + (index + 1));

    svg.appendChild(sensorCircle);
    svg.appendChild(sensorLabel);
  });

  // Tooltip para mostrar información del sensor
  const tooltip = el("div", {
    id: "sensor-tooltip",
    style: `
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      max-width: 250px;
      z-index: 1000;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `
  });

  // Función para mostrar tooltip
  function showTooltip(event, sensor) {
    const tooltipElement = document.getElementById('sensor-tooltip');
    if (!tooltipElement) return;

    const status = getSensorStatus(sensor);
    const color = getStatusColor(status);
    const statusText = status === 'alert' ? 'Alerta' : status === 'warning' ? 'Advertencia' : 'Normal';

    tooltipElement.innerHTML = `
      <h3 style="margin-top: 0; margin-bottom: 10px; color: ${color}; font-size: 16px;">
        ${sensor.tipo_sensor.charAt(0).toUpperCase() + sensor.tipo_sensor.slice(1)}
      </h3>
      <p style="margin: 5px 0;"><strong>Valor:</strong> ${sensor.valor}${sensor.unidad || ''}</p>
      <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: ${color}">${statusText}</span></p>
      <p style="margin: 5px 0;"><strong>Última lectura:</strong> ${new Date(sensor.timestamp).toLocaleString()}</p>
      <p style="margin: 5px 0;"><strong>Dispositivo:</strong> ${device.nombre}</p>
    `;

    // Posicionar tooltip
    const rect = event.target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    tooltipElement.style.left = (rect.left - containerRect.left + rect.width + 10) + 'px';
    tooltipElement.style.top = (rect.top - containerRect.top - 10) + 'px';
    tooltipElement.style.display = 'block';
  }

  // Función para ocultar tooltip
  function hideTooltip() {
    const tooltipElement = document.getElementById('sensor-tooltip');
    if (tooltipElement) {
      tooltipElement.style.display = 'none';
    }
  }

  // Agregar event listeners a los sensores
  svg.addEventListener('mouseover', (event) => {
    if (event.target.classList.contains('sensor-point')) {
      const sensorType = event.target.getAttribute('data-sensor');
      const sensor = sensorData.find(s => s.tipo_sensor === sensorType);
      if (sensor) {
        showTooltip(event, sensor);
      }
    }
  });

  svg.addEventListener('mouseout', (event) => {
    if (event.target.classList.contains('sensor-point')) {
      setTimeout(hideTooltip, 100); // Pequeño delay para evitar parpadeo
    }
  });

  svg.addEventListener('mousemove', (event) => {
    if (event.target.classList.contains('sensor-point')) {
      const tooltipElement = document.getElementById('sensor-tooltip');
      if (tooltipElement && tooltipElement.style.display === 'block') {
        const rect = event.target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        tooltipElement.style.left = (rect.left - containerRect.left + rect.width + 10) + 'px';
        tooltipElement.style.top = (rect.top - containerRect.top - 10) + 'px';
      }
    }
  });

  // Cerrar tooltip al hacer clic fuera
  document.addEventListener('click', (event) => {
    if (!event.target.classList.contains('sensor-point')) {
      hideTooltip();
    }
  });

  // Título del dispositivo
  const title = el("h3", {
    style: "margin-bottom: 15px; text-align: center;"
  }, `Visualización: ${device.nombre}`);

  // Información del dispositivo
  const deviceInfo = el("div", {
    style: "margin-bottom: 15px; text-align: center; color: #666; font-size: 14px;"
  }, 
    el("p", {}, `Tipo: ${device.tipo || 'N/A'} | Ubicación: ${device.ubicacion || 'N/A'}`),
    el("p", {}, `Estado: ${device.estado} | Sensores: ${sensorData.length}`)
  );

  // Leyenda de estados
  const legend = el("div", {
    style: "display: flex; justify-content: center; gap: 20px; margin-top: 15px; font-size: 12px;"
  },
    el("div", { style: "display: flex; align-items: center; gap: 5px;" },
      el("div", { style: "width: 12px; height: 12px; border-radius: 50%; background: #4CAF50;" }),
      el("span", {}, "Normal")
    ),
    el("div", { style: "display: flex; align-items: center; gap: 5px;" },
      el("div", { style: "width: 12px; height: 12px; border-radius: 50%; background: #FF9800;" }),
      el("span", {}, "Advertencia")
    ),
    el("div", { style: "display: flex; align-items: center; gap: 5px;" },
      el("div", { style: "width: 12px; height: 12px; border-radius: 50%; background: #F44336;" }),
      el("span", {}, "Alerta")
    )
  );

  // Construir el componente completo
  container.appendChild(title);
  container.appendChild(deviceInfo);
  container.appendChild(svg);
  container.appendChild(tooltip);
  container.appendChild(legend);

  return container;
}

// Agregar estilos CSS para la animación de pulso
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
  }
  
  .sensor-point:hover {
    r: 12;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)) !important;
  }
`;
document.head.appendChild(style);
