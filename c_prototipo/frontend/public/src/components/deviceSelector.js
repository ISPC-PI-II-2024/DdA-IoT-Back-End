// ==========================
// Componente de selección de dispositivos con buscador y desplegable
// ==========================
import { el } from "../utils/dom.js";
import { getState, setDevices, selectDevice } from "../state/store.js";
import { deviceService } from "../utils/deviceService.js";

export async function deviceSelectorWidget() {
  const state = getState();
  const devices = state.devices;
  const selectedDevice = state.selectedDevice;
  
  // Cargar dispositivos si no están cargados (solo una vez)
  if (devices.length === 0) {
    try {
      await deviceService.getAllDevices();
    } catch (error) {
      console.error('[ERROR] Error cargando dispositivos:', error);
    }
  }

  const currentDevices = getState().devices;

  // Crear el selector con buscador personalizado
  const container = el("div", {
    class: "device-selector",
    style: "position: relative; width: 100%; margin-bottom: 20px;"
  });

  // Título
  const titleContainer = el("div", {});
  const title = el("h3", {
    style: "margin-bottom: 10px;"
  }, "Dispositivo Seleccionado");
  const subtitle = el("p", {
    style: "font-size: 0.85em; color: #666; margin-bottom: 8px;"
  }, "Selecciona un Endpoint o Sensor para ver sus lecturas");
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(subtitle);

  // Input de búsqueda
  const searchInput = el("input", {
    type: "text",
    placeholder: "Buscar dispositivo...",
    value: selectedDevice ? `${selectedDevice.nombre} (${selectedDevice.id_dispositivo})` : "",
    class: "device-search-input",
    style: "width: 100%; padding: 10px 35px 10px 10px; border: 1px solid #ddd; border-radius: 4px 4px 0 0; background: white; font-size: 14px;"
  });

  // Ícono de búsqueda
  const searchIcon = el("span", {
    style: "position: absolute; right: 12px; top: 47px; color: #999; pointer-events: none;"
  }, "🔍");

  // Dropdown de opciones
  const dropdown = el("div", {
    class: "device-dropdown",
    id: "device-dropdown",
    style: "max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; background: white; display: none; position: absolute; width: 100%; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
  });

  container.appendChild(titleContainer);
  container.appendChild(searchInput);
  container.appendChild(searchIcon);
  container.appendChild(dropdown);

  // Función para renderizar opciones
  function renderOptions(filterText = '') {
    dropdown.innerHTML = '';
    const filter = filterText.toLowerCase();

    // Filtrar solo endpoints y sensores (NO gateways)
    const selectableDevices = currentDevices.filter(device => 
      device.tipo === 'endpoint' || device.tipo === 'sensor'
    );

    // Si no hay filtro, mostrar todos los dispositivos seleccionables
    // Si hay filtro, mostrar solo los que coinciden
    const filteredDevices = !filter ? selectableDevices : 
                           selectableDevices.filter(device => {
                             const deviceName = `${device.nombre} ${device.id_dispositivo}`.toLowerCase();
                             return deviceName.includes(filter);
                           });

    filteredDevices.forEach(device => {
      // Indicador de tipo
      const typeColor = device.tipo === 'gateway' ? '#2196F3' : 
                       device.tipo === 'endpoint' ? '#9C27B0' : '#FF9800';
      const typeLabel = device.tipo === 'gateway' ? 'Gateway' : 
                       device.tipo === 'endpoint' ? 'Endpoint' : 'Sensor';

      const option = el("div", {
        class: "device-option",
        style: "padding: 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;"
      });

      const optionContent = el("div", {
        style: "display: flex; align-items: center; gap: 10px;"
      },
        el("span", {
          style: `width: 10px; height: 10px; border-radius: 50%; background: ${typeColor}; flex-shrink: 0;`
        }),
        el("div", {
          style: "flex: 1; min-width: 0;"
        },
          el("div", {
            style: "font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
          }, device.nombre),
          el("div", {
            style: "font-size: 0.85em; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
          }, `${device.id_dispositivo} • ${device.ubicacion || 'Sin ubicación'}`)
        ),
        el("span", {
          style: `background: ${typeColor}20; color: ${typeColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; flex-shrink: 0;`
        }, typeLabel)
      );
      
      option.appendChild(optionContent);
      
      // Efecto hover
      option.addEventListener('mouseenter', () => {
        option.style.background = '#f5f5f5';
      });
      
      option.addEventListener('mouseleave', () => {
        option.style.background = 'white';
      });
      
      option.addEventListener('click', () => {
        selectDevice(device);
        searchInput.value = `${device.nombre} (${device.id_dispositivo})`;
        dropdown.style.display = 'none';
        // Disparar evento personalizado
        container.dispatchEvent(new CustomEvent('deviceSelected', { 
          detail: { device } 
        }));
      });
      
      dropdown.appendChild(option);
    });

    // Si no hay resultados
    if (filteredDevices.length === 0) {
      const noResults = el("div", {
        style: "padding: 15px; text-align: center; color: #999;"
      }, 
        el("div", { style: "font-size: 2em; margin-bottom: 5px;" }, "🔍"),
        el("div", {}, "No se encontraron dispositivos")
      );
      dropdown.appendChild(noResults);
    }
  }

  // Event listeners
  searchInput.addEventListener('focus', () => {
    renderOptions(searchInput.value);
    dropdown.style.display = 'block';
  });

  searchInput.addEventListener('input', (e) => {
    const filterText = e.target.value;
    renderOptions(filterText);
    dropdown.style.display = 'block';
  });

  // Cerrar dropdown al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Atajo de teclado para abrir el dropdown (Ctrl/Cmd + K)
  searchInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      renderOptions();
      dropdown.style.display = 'block';
    }
  });

  // Renderizar opciones iniciales si hay dispositivo seleccionado
  if (selectedDevice) {
    renderOptions();
  }

  return container;
}

// Función para crear un widget de información del dispositivo seleccionado
export function selectedDeviceInfoWidget() {
  const { selectedDevice } = getState();
  
  if (!selectedDevice) {
    return el("div", {
      class: "card",
      style: "text-align: center; color: #666; padding: 20px;"
    }, "No hay dispositivo seleccionado");
  }

  const statusColor = selectedDevice.estado === 'en_linea' ? '#4CAF50' : 
                     selectedDevice.estado === 'fuera_linea' ? '#FF9800' : '#F44336';

  return el("div", {
    class: "card"
  }, 
    el("h3", {}, "Dispositivo Seleccionado"),
    el("div", {
      style: "display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"
    },
      el("div", {},
        el("h4", {}, "Información General"),
        el("ul", { style: "list-style: none; padding: 0;" },
          el("li", { style: "margin-bottom: 8px;" }, 
            el("strong", {}, "Nombre: "), selectedDevice.nombre
          ),
          el("li", { style: "margin-bottom: 8px;" }, 
            el("strong", {}, "ID: "), selectedDevice.id_dispositivo
          ),
          el("li", { style: "margin-bottom: 8px;" }, 
            el("strong", {}, "Tipo: "), selectedDevice.tipo || 'N/A'
          ),
          el("li", { style: "margin-bottom: 8px;" }, 
            el("strong", {}, "Ubicación: "), selectedDevice.ubicacion || 'N/A'
          )
        )
      ),
      el("div", {},
        el("h4", {}, "Estado"),
        el("div", {
          style: "display: flex; align-items: center; gap: 10px; margin-bottom: 10px;"
        },
          el("span", {
            style: `width: 12px; height: 12px; border-radius: 50%; background-color: ${statusColor};`
          }),
          el("span", { style: "text-transform: capitalize;" }, selectedDevice.estado)
        ),
        el("div", {},
          el("strong", {}, "Última conexión: "),
          selectedDevice.ultima_conexion ? 
            new Date(selectedDevice.ultima_conexion).toLocaleString() : 
            'Nunca'
        )
      )
    )
  );
}
