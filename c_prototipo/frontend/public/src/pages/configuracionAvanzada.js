// ==========================
// Página de configuración avanzada
// Acceso solo para administradores
// Configuración de umbrales, triggers y parámetros del sistema
// ==========================
import { el } from "../utils/dom.js";
import { getState } from "../state/store.js";
import { ConfigAPI, invalidateCache } from "../api.js";
import { configService } from "../utils/configService.js";
import { mqttTopicsService } from "../utils/mqttTopicsService.js";
import { mqttTopicsManager } from "../components/mqttTopicsManager.js";

export async function render() {
  const { role } = getState();
  
  // Verificar acceso de admin
  if (role !== "admin") {
    return el("div", { class: "container" },
      el("div", { class: "card error" },
        el("h2", {}, "Acceso Denegado"),
        el("p", {}, "Solo los administradores pueden acceder a la configuración avanzada."),
        el("button", { 
          class: "btn",
          onClick: () => location.hash = "#/configuracion"
        }, "Volver a Configuración")
      )
    );
  }

  // Configuración de umbrales para temperatura
  const umbralesTemperatura = el("div", { class: "card" },
    el("h3", {}, "Umbrales de Temperatura"),
    el("div", { class: "form-section" },
      el("div", { class: "form-group" },
        el("label", { for: "temp_min" }, "Temperatura Mínima Normal (°C):"),
        el("input", { 
          type: "number", 
          id: "temp_min", 
          name: "temp_min", 
          step: "0.1",
          placeholder: "15.0"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "temp_max" }, "Temperatura Máxima Normal (°C):"),
        el("input", { 
          type: "number", 
          id: "temp_max", 
          name: "temp_max", 
          step: "0.1",
          placeholder: "30.0"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "temp_critical_min" }, "Temperatura Crítica Mínima (°C):"),
        el("input", { 
          type: "number", 
          id: "temp_critical_min", 
          name: "temp_critical_min", 
          step: "0.1",
          placeholder: "5.0"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "temp_critical_max" }, "Temperatura Crítica Máxima (°C):"),
        el("input", { 
          type: "number", 
          id: "temp_critical_max", 
          name: "temp_critical_max", 
          step: "0.1",
          placeholder: "40.0"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_temp_alerts",
            name: "enable_temp_alerts"
          }),
          " Habilitar alertas de temperatura"
        )
      )
    )
  );

  // Configuración de umbrales para humedad
  const umbralesHumedad = el("div", { class: "card" },
    el("h3", {}, "Umbrales de Humedad"),
    el("div", { class: "form-section" },
      el("div", { class: "form-group" },
        el("label", { for: "humidity_min" }, "Humedad Mínima (%):"),
        el("input", { 
          type: "number", 
          id: "humidity_min", 
          name: "humidity_min", 
          step: "0.1",
          min: "0",
          max: "100",
          placeholder: "30.0"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "humidity_max" }, "Humedad Máxima (%):"),
        el("input", { 
          type: "number", 
          id: "humidity_max", 
          name: "humidity_max", 
          step: "0.1",
          min: "0",
          max: "100",
          placeholder: "80.0"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_humidity_alerts",
            name: "enable_humidity_alerts"
          }),
          " Habilitar alertas de humedad"
        )
      )
    )
  );

  // Configuración de umbrales para batería
  const umbralesBateria = el("div", { class: "card" },
    el("h3", {}, "Umbrales de Batería"),
    el("div", { class: "form-section" },
      el("div", { class: "form-group" },
        el("label", { for: "battery_low" }, "Umbral de Batería Baja (%):"),
        el("input", { 
          type: "number", 
          id: "battery_low", 
          name: "battery_low", 
          step: "1",
          min: "0",
          max: "100",
          placeholder: "20"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_battery_alerts",
            name: "enable_battery_alerts"
          }),
          " Habilitar alertas de batería"
        )
      )
    )
  );

  // Configuración de umbrales para CO2
  const umbralesCO2 = el("div", { class: "card" },
    el("h3", {}, "Umbrales de CO₂"),
    el("div", { class: "form-section" },
      el("div", { class: "form-group" },
        el("label", { for: "co2_normal_max" }, "Nivel Normal Máximo (ppm):"),
        el("input", { 
          type: "number", 
          id: "co2_normal_max", 
          name: "co2_normal_max", 
          step: "1",
          min: "0",
          placeholder: "1000"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "co2_warning" }, "Umbral de Advertencia (ppm):"),
        el("input", { 
          type: "number", 
          id: "co2_warning", 
          name: "co2_warning", 
          step: "1",
          min: "0",
          placeholder: "1500"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "co2_critical" }, "Nivel Crítico (ppm):"),
        el("input", { 
          type: "number", 
          id: "co2_critical", 
          name: "co2_critical", 
          step: "1",
          min: "0",
          placeholder: "2000"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_co2_alerts",
            name: "enable_co2_alerts"
          }),
          " Habilitar alertas de CO₂"
        )
      )
    )
  );

  // Configuración de triggers para gráficos
  const triggersGraficos = el("div", { class: "card" },
    el("h3", {}, "Triggers de Gráficos"),
    el("div", { class: "form-section" },
      el("div", { class: "form-group" },
        el("label", { for: "chart_update_interval" }, "Intervalo de actualización (ms):"),
        el("input", { 
          type: "number", 
          id: "chart_update_interval", 
          name: "chart_update_interval", 
          min: "100",
          value: "1000",
          placeholder: "1000"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "chart_data_points" }, "Puntos máximos de datos:"),
        el("input", { 
          type: "number", 
          id: "chart_data_points", 
          name: "chart_data_points", 
          min: "10",
          max: "1000",
          value: "60",
          placeholder: "60"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "auto_scale_charts" }, "Escalado automático:"),
        el("select", { id: "auto_scale_charts", name: "auto_scale_charts" },
          el("option", { value: "true" }, "Habilitado"),
          el("option", { value: "false" }, "Deshabilitado")
        )
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_real_time",
            name: "enable_real_time"
          }),
          " Modo tiempo real (actualizaciones continuas)"
        )
      )
    )
  );

  // Configuración del sistema MQTT
  const configMQTT = el("div", { class: "card" },
    el("h3", {}, "Configuración MQTT"),
    el("div", { class: "form-section" },
      // Información de tópicos disponibles
      el("div", { class: "form-group" },
        el("label", {}, "Tópicos MQTT Disponibles:"),
        el("div", { 
          id: "mqtt-topics-info",
          class: "info-grid",
          style: "margin-top: 10px;"
        }),
        el("button", {
          type: "button",
          id: "refresh-topics-btn",
          class: "btn btn-sm btn-outline",
          style: "margin-top: 10px;"
        }, "🔄 Actualizar Tópicos")
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "mqtt_qos_level" }, "Nivel QoS por defecto:"),
        el("select", { id: "mqtt_qos_level", name: "mqtt_qos_level" },
          el("option", { value: "0" }, "QoS 0 - Al menos una vez"),
          el("option", { value: "1" }, "QoS 1 - Exactamente una vez"),
          el("option", { value: "2" }, "QoS 2 - Máximo una vez")
        )
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "mqtt_timeout" }, "Timeout de conexión (ms):"),
        el("input", { 
          type: "number", 
          id: "mqtt_timeout", 
          name: "mqtt_timeout", 
          min: "1000",
          value: "30000",
          placeholder: "30000"
        })
      ),
      
      // Acciones administrativas MQTT
      el("div", { class: "form-group" },
        el("label", {}, "Acciones Administrativas:"),
        el("div", { class: "actions-grid" },
          el("button", {
            type: "button",
            id: "reload-mqtt-topics-btn",
            class: "btn btn-sm btn-action"
          }, "🔄 Recargar Tópicos desde DB"),
          el("button", {
            type: "button",
            id: "restart-mqtt-btn",
            class: "btn btn-sm btn-danger"
          }, "🔄 Reiniciar Conexión MQTT"),
          el("button", {
            type: "button",
            id: "clear-cache-btn",
            class: "btn btn-sm btn-warning"
          }, "🗑️ Limpiar Cache")
        )
      )
    )
  );

  // Configuración de notificaciones avanzadas
  const notificacionesAvanzadas = el("div", { class: "card" },
    el("h3", {}, "Notificaciones Avanzadas"),
    el("div", { class: "form-section" },
      el("div", { class: "form-group" },
        el("label", { for: "email_notifications" }, "Notificaciones por Email:"),
        el("input", { 
          type: "email", 
          id: "email_notifications", 
          name: "email_notifications", 
          placeholder: "admin@empresa.com"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { for: "notification_cooldown" }, "Cooldown entre notificaciones (minutos):"),
        el("input", { 
          type: "number", 
          id: "notification_cooldown", 
          name: "notification_cooldown", 
          min: "1",
          value: "5",
          placeholder: "5"
        })
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_logging",
            name: "enable_logging"
          }),
          " Habilitar logging detallado"
        )
      ),
      
      el("div", { class: "form-group" },
        el("label", { class: "checkbox-label" },
          el("input", { 
            type: "checkbox", 
            id: "enable_debug_mode",
            name: "enable_debug_mode"
          }),
          " Modo debug (solo desarrollo)"
        )
      )
    )
  );

  // Panel de acciones administrativas
  const accionesAdmin = el("div", { class: "card admin-actions" },
    el("h3", {}, "Acciones Administrativas"),
    el("div", { class: "form-section" },
      el("div", { class: "actions-grid" },
        el("button", { 
          class: "btn btn-action",
          onClick: () => reloadMQTTConnection()
        }, "Reiniciar Conexión MQTT"),
        
        el("button", { 
          class: "btn btn-action",
          onClick: () => clearDataCache()
        }, "Limpiar Cache de Datos"),
        
        el("button", { 
          class: "btn btn-action",
          onClick: () => exportConfiguration()
        }, "Exportar Configuración"),
        
        el("button", { 
          class: "btn btn-action",
          onClick: () => importConfiguration()
        }, "Importar Configuración"),
        
        el("button", { 
          class: "btn btn-danger",
          onClick: () => resetSystemConfig()
        }, "Resetear Sistema")
      )
    )
  );

  // Funciones para manejar la configuración avanzada
  window.saveAdvancedConfig = async function() {
    const config = {
      thresholds: {
        // Umbrales de temperatura
        tempMin: parseFloat(document.getElementById("temp_min").value) || 15.0,
        tempMax: parseFloat(document.getElementById("temp_max").value) || 30.0,
        tempCriticalMin: parseFloat(document.getElementById("temp_critical_min").value) || 5.0,
        tempCriticalMax: parseFloat(document.getElementById("temp_critical_max").value) || 40.0,
        // Umbrales de humedad
        humidityMin: parseFloat(document.getElementById("humidity_min").value) || 30.0,
        humidityMax: parseFloat(document.getElementById("humidity_max").value) || 80.0,
        // Umbral de batería
        batteryLow: parseFloat(document.getElementById("battery_low").value) || 20.0,
        // Umbrales de CO2
        co2NormalMax: parseFloat(document.getElementById("co2_normal_max").value) || 1000,
        co2Warning: parseFloat(document.getElementById("co2_warning").value) || 1500,
        co2Critical: parseFloat(document.getElementById("co2_critical").value) || 2000,
        // Configuración de alertas
        enableTempAlerts: document.getElementById("enable_temp_alerts").checked,
        enableHumidityAlerts: document.getElementById("enable_humidity_alerts").checked,
        enableBatteryAlerts: document.getElementById("enable_battery_alerts").checked,
        enableCO2Alerts: document.getElementById("enable_co2_alerts").checked
      },
      charts: {
        updateInterval: parseInt(document.getElementById("chart_update_interval").value) || 1000,
        dataPoints: parseInt(document.getElementById("chart_data_points").value) || 60,
        autoScale: document.getElementById("auto_scale_charts").value === "true",
        realTime: document.getElementById("enable_real_time").checked
      },
      mqtt: {
        qosLevel: parseInt(document.getElementById("mqtt_qos_level").value),
        timeout: parseInt(document.getElementById("mqtt_timeout").value) || 30000
      },
      notifications: {
        email: document.getElementById("email_notifications").value,
        cooldown: parseInt(document.getElementById("notification_cooldown").value) || 5,
        logging: document.getElementById("enable_logging").checked,
        debugMode: document.getElementById("enable_debug_mode").checked
      }
    };
    
    try {
      // Guardar usando ConfigService (que sincroniza local y remoto)
      const success = await configService.setAdvancesConfig(config);
      
      // También actualizar umbrales en el servidor MQTT
      try {
        const { GatewayAPI } = await import("../api.js");
        if (GatewayAPI && GatewayAPI.updateThresholds) {
          await GatewayAPI.updateThresholds(config.thresholds);
          console.log("Umbrales actualizados en el servidor MQTT");
        } else {
          console.warn("GatewayAPI no disponible o método updateThresholds no encontrado");
        }
      } catch (mqttError) {
        console.warn("No se pudieron actualizar umbrales en MQTT:", mqttError);
      }
      
      if (success) {
        // Invalidar cache de configuración avanzada en la API
        invalidateCache("/config/advanced", "GET");
        
        alert("Configuración avanzada guardada exitosamente");
        console.log("Configuración avanzada:", config);
      } else {
        throw new Error("Error guardando configuración");
      }
      
    } catch (error) {
      console.error("Error guardando configuración avanzada:", error);
      alert("Error guardando la configuración");
    }
  };

  // Funciones de acciones administrativas
  window.reloadMQTTConnection = async function() {
    if (confirm("¿Reiniciar la conexión MQTT? Esto puede interrumpir temporalmente la recepción de datos.")) {
      try {
        await ConfigAPI.restartMQTTConnection();
        alert("Conexión MQTT reiniciada");
      } catch (error) {
        alert("Error reiniciando conexión MQTT: " + error.message);
      }
    }
  };

  window.clearDataCache = async function() {
    if (confirm("¿Limpiar el cache de datos? Los datos en memoria se perderán.")) {
      try {
        await ConfigAPI.clearDataCache();
        alert("Cache de datos limpiado");
      } catch (error) {
        alert("Error limpiando cache: " + error.message);
      }
    }
  };

  window.exportConfiguration = function() {
    try {
      const configData = configService.exportConfig();
      const dataStr = JSON.stringify(configData, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `configuracion-sistema-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(link.href);
    } catch (error) {
      alert("Error exportando configuración");
    }
  };

  window.importConfiguration = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const config = JSON.parse(e.target.result);
            localStorage.setItem("advanced_config", JSON.stringify(config));
            alert("Configuración importada exitosamente");
            location.reload(); // Recargar para aplicar cambios
          } catch (error) {
            alert("Error importando configuración: formato inválido");
          }
        };
        reader.readAsText(file);
      }
    };
    
    input.send();
  };

  window.resetSystemConfig = function() {
    if (confirm("¿Resetear toda la configuración del sistema a valores por defecto? Esta acción no se puede deshacer.")) {
      if (confirm("Esta acción eliminará TODA la configuración personalizada. ¿Continuar?")) {
        try {
          configService.resetAll();
          alert("Configuración del sistema reseteada");
          location.reload();
        } catch (error) {
          alert("Error reseteando configuración");
        }
      }
    }
  };

  // Cargar configuración existente usando ConfigService
  const loadAdvancedConfig = async () => {
    try {
      // Primero intentar cargar desde el servidor (solo admin)
      try {
        const serverConfig = await configService.loadFromServer("advanced");
        await configService.setAdvancesConfig(serverConfig);
      } catch (error) {
        console.warn("No se pudo cargar configuración del servidor, usando local:", error);
      }
      
      // Luego cargar desde ConfigService
      const config = configService.getAdvancedConfig();
      
      // Cargar umbrales
      if (config.thresholds) {
        // Umbrales de temperatura
        document.getElementById("temp_min").value = config.thresholds.tempMin || "";
        document.getElementById("temp_max").value = config.thresholds.tempMax || "";
        document.getElementById("temp_critical_min").value = config.thresholds.tempCriticalMin || "";
        document.getElementById("temp_critical_max").value = config.thresholds.tempCriticalMax || "";
        document.getElementById("enable_temp_alerts").checked = config.thresholds.enableTempAlerts || false;
        
        // Umbrales de humedad
        document.getElementById("humidity_min").value = config.thresholds.humidityMin || "";
        document.getElementById("humidity_max").value = config.thresholds.humidityMax || "";
        document.getElementById("enable_humidity_alerts").checked = config.thresholds.enableHumidityAlerts || false;
        
        // Umbrales de batería
        document.getElementById("battery_low").value = config.thresholds.batteryLow || "";
        document.getElementById("enable_battery_alerts").checked = config.thresholds.enableBatteryAlerts || false;
        
        // Umbrales de CO2
        document.getElementById("co2_normal_max").value = config.thresholds.co2NormalMax || "";
        document.getElementById("co2_warning").value = config.thresholds.co2Warning || "";
        document.getElementById("co2_critical").value = config.thresholds.co2Critical || "";
        document.getElementById("enable_co2_alerts").checked = config.thresholds.enableCO2Alerts || false;
      }
      
      // Cargar configuración de gráficos
      if (config.charts) {
        document.getElementById("chart_update_interval").value = config.charts.updateInterval || 1000;
        document.getElementById("chart_data_points").value = config.charts.dataPoints || 60;
        document.getElementById("auto_scale_charts").value = config.charts.autoScale ? "true" : "false";
        document.getElementById("enable_real_time").checked = config.charts.realTime || false;
      }

      // Cargar configuración MQTT
      if (config.mqtt) {
        document.getElementById("mqtt_qos_level").value = config.mqtt.qosLevel || "1";
        document.getElementById("mqtt_timeout").value = config.mqtt.timeout || 30000;
      }
      
      // Cargar configuración de notificaciones
      if (config.notifications) {
        document.getElementById("email_notifications").value = config.notifications.email || "";
        document.getElementById("notification_cooldown").value = config.notifications.cooldown || 5;
        document.getElementById("enable_logging").checked = config.notifications.logging || false;
        document.getElementById("enable_debug_mode").checked = config.notifications.debugMode || false;
      }
      
    } catch (error) {
      console.error("Error cargando configuración avanzada:", error);
    }
  };

  const loadMQTTTopics = async () => {
    try {
      const topics = await mqttTopicsService.loadTopics();
      const stats = mqttTopicsService.getStats();
      const connectionInfo = await mqttTopicsService.getConnectionInfo();
      
      const topicsInfo = document.getElementById("mqtt-topics-info");
      if (!topicsInfo) return;
      
      // Limpiar contenido anterior
      topicsInfo.innerHTML = "";
      
      // Información de conexión
      if (connectionInfo) {
        const statusColor = connectionInfo.connected ? "var(--color-exito)" : "var(--color-error)";
        const statusText = connectionInfo.connected ? "Conectado" : "Desconectado";
        
        topicsInfo.appendChild(el("div", { class: "info-item" },
          el("strong", {}, "Estado MQTT:"),
          el("span", { style: `color: ${statusColor}; font-weight: bold;` }, statusText)
        ));
        
        topicsInfo.appendChild(el("div", { class: "info-item" },
          el("strong", {}, "Broker:"),
          el("span", {}, connectionInfo.brokerUrl || "N/A")
        ));
        
        topicsInfo.appendChild(el("div", { class: "info-item" },
          el("strong", {}, "Fuente:"),
          el("span", {}, connectionInfo.topicsFromDB ? "Base de datos" : "Variables de entorno")
        ));
      }
      
      // Estadísticas de tópicos
      topicsInfo.appendChild(el("div", { class: "info-item" },
        el("strong", {}, "Total de tópicos:"),
        el("span", {}, stats.total.toString())
      ));
      
      // Tópicos por tipo
      Object.entries(stats.byType).forEach(([type, count]) => {
        topicsInfo.appendChild(el("div", { class: "info-item" },
          el("strong", {}, `${type.charAt(0).toUpperCase() + type.slice(1)}:`),
          el("span", {}, count.toString())
        ));
      });
      
      // Lista de tópicos disponibles
      if (topics.length > 0) {
        const topicsList = el("div", { class: "info-item" },
          el("strong", {}, "Tópicos disponibles:"),
          el("div", { style: "margin-top: 5px; max-height: 150px; overflow-y: auto;" })
        );
        
        const listContainer = topicsList.querySelector("div");
        
        topics.forEach(topic => {
          const topicItem = el("div", { 
            class: "info-item",
            style: "padding: 5px; border-left: 3px solid var(--color-primario); margin-bottom: 5px; background: #f8f9fa;"
          },
            el("div", { style: "font-weight: bold; color: var(--color-primario);" }, topic.nombre),
            el("div", { style: "font-size: 0.85rem; color: var(--color-texto-secundario);" }, 
              topic.descripcion || "Sin descripción"
            ),
            el("div", { style: "font-size: 0.8rem; color: var(--color-texto-secundario);" },
              `Tipo: ${topic.tipo_datos} | QoS: ${topic.qos_level}${topic.dispositivo_asociado ? ` | Dispositivo: ${topic.dispositivo_asociado}` : ''}`
            )
          );
          
          listContainer.appendChild(topicItem);
        });
        
        topicsInfo.appendChild(topicsList);
      } else {
        topicsInfo.appendChild(el("div", { class: "info-item" },
          el("span", { style: "color: var(--color-warning);" }, "No hay tópicos disponibles")
        ));
      }
      
    } catch (error) {
      console.error("Error cargando tópicos MQTT:", error);
      const topicsInfo = document.getElementById("mqtt-topics-info");
      if (topicsInfo) {
        topicsInfo.innerHTML = el("div", { class: "error" },
          "Error cargando tópicos MQTT: " + error.message
        ).outerHTML;
      }
    }
  };

  // Event listeners para botones MQTT
  const setupMQTTEventListeners = () => {
    // Botón para actualizar tópicos
    const refreshBtn = document.getElementById("refresh-topics-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadMQTTTopics);
    }
    
    // Botón para recargar tópicos desde DB
    const reloadBtn = document.getElementById("reload-mqtt-topics-btn");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", async () => {
        try {
          const result = await mqttTopicsService.reloadTopics();
          if (result) {
            alert("Tópicos MQTT recargados exitosamente");
            await loadMQTTTopics();
          } else {
            alert("Error recargando tópicos MQTT");
          }
        } catch (error) {
          alert("Error recargando tópicos: " + error.message);
        }
      });
    }
    
    // Botón para reiniciar conexión MQTT
    const restartBtn = document.getElementById("restart-mqtt-btn");
    if (restartBtn) {
      restartBtn.addEventListener("click", async () => {
        try {
          const response = await ConfigAPI.restartMQTTConnection();
          if (response.success) {
            alert("Conexión MQTT reiniciada exitosamente");
            await loadMQTTTopics();
          } else {
            alert("Error reiniciando conexión MQTT");
          }
        } catch (error) {
          alert("Error reiniciando conexión: " + error.message);
        }
      });
    }
    
    // Botón para limpiar cache
    const clearCacheBtn = document.getElementById("clear-cache-btn");
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener("click", async () => {
        try {
          const response = await ConfigAPI.clearDataCache();
          if (response.success) {
            alert("Cache de datos limpiado exitosamente");
          } else {
            alert("Error limpiando cache");
          }
        } catch (error) {
          alert("Error limpiando cache: " + error.message);
        }
      });
    }
  };

  // Cargar configuración cuando se monta el componente
  let loadConfigTimeout = null;
  let mqttEventListeners = [];
  
  loadConfigTimeout = setTimeout(async () => {
    await loadAdvancedConfig();
    await loadMQTTTopics();
    setupMQTTEventListeners();
  }, 100);

  // Limpieza al salir de la página
  const cleanup = () => {
    // Limpiar timeout
    if (loadConfigTimeout) {
      clearTimeout(loadConfigTimeout);
      loadConfigTimeout = null;
    }
    
    // Limpiar event listeners de botones MQTT
    const refreshBtn = document.getElementById("refresh-topics-btn");
    const reloadBtn = document.getElementById("reload-mqtt-topics-btn");
    const restartBtn = document.getElementById("restart-mqtt-btn");
    const clearCacheBtn = document.getElementById("clear-cache-btn");
    
    if (refreshBtn) refreshBtn.replaceWith(refreshBtn.cloneNode(true));
    if (reloadBtn) reloadBtn.replaceWith(reloadBtn.cloneNode(true));
    if (restartBtn) restartBtn.replaceWith(restartBtn.cloneNode(true));
    if (clearCacheBtn) clearCacheBtn.replaceWith(clearCacheBtn.cloneNode(true));
    
    // Limpiar funciones globales
    delete window.saveAdvancedConfig;
    delete window.reloadMQTTConnection;
    delete window.clearDataCache;
    delete window.exportConfiguration;
    delete window.importConfiguration;
    delete window.resetSystemConfig;
    
    // Limpiar cache de configuración (solo cache en memoria, mantiene localStorage)
    configService.clearCache();
    
    console.log('[Configuración Avanzada] Limpieza completada');
  };

  // Escuchar evento de navegación para limpiar
  const navigationHandler = () => {
    cleanup();
    window.removeEventListener('hashchange', navigationHandler);
    window.removeEventListener('beforeunload', cleanup);
  };

  window.addEventListener('hashchange', navigationHandler);
  window.addEventListener('beforeunload', cleanup);

  // Crear el componente de gestión de tópicos MQTT
  const mqttTopicsManagerComponent = await mqttTopicsManager();

  return el("div", { class: "advanced-config-container" },
    el("div", { class: "config-header" },
      el("div", { class: "header-actions" },
        el("button", { 
          class: "btn btn-secondary",
          onClick: () => location.hash = "#/configuracion"
        }, "← Volver"),
        el("button", { 
          class: "btn",
          onClick: () => saveAdvancedConfig()
        }, "Guardar Configuración")
      ),
      el("h2", {}, "Configuración Avanzada"),
      el("p", { class: "muted" }, "Configuración administrativa del sistema IoT")
    ),
    
    el("div", { class: "grid cols-2" },
      el("div", {}, umbralesTemperatura, umbralesHumedad, umbralesBateria, umbralesCO2, triggersGraficos),
      el("div", {}, configMQTT, notificacionesAvanzadas)
    ),
    
    // Gestión de tópicos MQTT
    mqttTopicsManagerComponent,
    
    accionesAdmin
  );
}
