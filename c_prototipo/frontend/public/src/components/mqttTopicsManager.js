// ==========================
// Componente para gestión de tópicos MQTT
// Solo accesible para administradores
// Permite crear, editar y eliminar tópicos MQTT
// ==========================

import { el } from "../utils/dom.js";
import { ConfigAPI } from "../api.js";
import { mqttTopicsService } from "../utils/mqttTopicsService.js";

export async function mqttTopicsManager() {
  let topics = [];
  let editingTopic = null;
  let isCreating = false;

  // Función para cargar tópicos desde el servidor
  const loadTopics = async () => {
    try {
      const response = await ConfigAPI.getMQTTTopics();
      if (response.success) {
        topics = response.data.topics || [];
        renderTopicsTable();
      }
    } catch (error) {
      console.error("Error cargando tópicos:", error);
      showError("Error cargando tópicos: " + error.message);
    }
  };

  // Función para renderizar la tabla de tópicos
  const renderTopicsTable = () => {
    const tableBody = document.getElementById("topics-table-body");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (topics.length === 0) {
      tableBody.appendChild(el("tr", {},
        el("td", { 
          colspan: "7", 
          style: "text-align: center; padding: 20px; color: #666;" 
        }, "No hay tópicos configurados")
      ));
      return;
    }

    topics.forEach(topic => {
      const row = el("tr", { "data-topic-id": topic.id },
        el("td", {}, topic.nombre),
        el("td", {}, topic.descripcion || "-"),
        el("td", {}, 
          el("span", { 
            class: `badge badge-${getTypeBadgeClass(topic.tipo_datos)}` 
          }, topic.tipo_datos)
        ),
        el("td", {}, `QoS ${topic.qos_level}`),
        el("td", {}, topic.dispositivo_asociado || "-"),
        el("td", {}, 
          el("span", { 
            class: topic.activo ? "status-active" : "status-inactive" 
          }, topic.activo ? "Activo" : "Inactivo")
        ),
        el("td", { class: "actions" },
          el("button", {
            class: "btn btn-sm btn-outline",
            onClick: () => editTopic(topic),
            title: "Editar tópico"
          }, "✏️"),
          el("button", {
            class: "btn btn-sm btn-danger",
            onClick: () => deleteTopic(topic),
            title: "Eliminar tópico"
          }, "🗑️")
        )
      );
      
      tableBody.appendChild(row);
    });
  };

  // Función para obtener la clase CSS del badge según el tipo
  const getTypeBadgeClass = (type) => {
    const typeClasses = {
      'temperatura': 'primary',
      'humedad': 'info',
      'presion': 'warning',
      'general': 'secondary',
      'comando': 'danger'
    };
    return typeClasses[type] || 'secondary';
  };

  // Función para mostrar el formulario de creación/edición
  const showTopicForm = (topic = null) => {
    const formContainer = document.getElementById("topic-form-container");
    if (!formContainer) return;

    editingTopic = topic;
    isCreating = !topic;

    const form = el("form", { 
      id: "topic-form",
      onSubmit: (e) => handleSubmit(e)
    },
      el("div", { class: "form-header" },
        el("h3", {}, isCreating ? "Crear Nuevo Tópico" : "Editar Tópico"),
        el("button", {
          type: "button",
          class: "btn btn-sm btn-secondary",
          onClick: hideTopicForm
        }, "✕ Cancelar")
      ),

      el("div", { class: "form-grid" },
        el("div", { class: "form-group" },
          el("label", { for: "topic-nombre" }, "Nombre del Tópico *"),
          el("input", {
            type: "text",
            id: "topic-nombre",
            name: "nombre",
            required: true,
            value: topic?.nombre || "",
            placeholder: "ej: sensor/temperatura/sala1"
          })
        ),

        el("div", { class: "form-group" },
          el("label", { for: "topic-descripcion" }, "Descripción"),
          el("textarea", {
            id: "topic-descripcion",
            name: "descripcion",
            value: topic?.descripcion || "",
            placeholder: "Descripción del tópico y su propósito",
            rows: "2"
          })
        ),

        el("div", { class: "form-group" },
          el("label", { for: "topic-tipo" }, "Tipo de Datos"),
          el("select", {
            id: "topic-tipo",
            name: "tipo_datos",
            value: topic?.tipo_datos || "general"
          },
            el("option", { value: "general" }, "General"),
            el("option", { value: "temperatura" }, "Temperatura"),
            el("option", { value: "humedad" }, "Humedad"),
            el("option", { value: "presion" }, "Presión"),
            el("option", { value: "comando" }, "Comando")
          )
        ),

        el("div", { class: "form-group" },
          el("label", { for: "topic-qos" }, "Nivel QoS"),
          el("select", {
            id: "topic-qos",
            name: "qos_level",
            value: topic?.qos_level || "1"
          },
            el("option", { value: "0" }, "QoS 0 - Al menos una vez"),
            el("option", { value: "1" }, "QoS 1 - Exactamente una vez"),
            el("option", { value: "2" }, "QoS 2 - Máximo una vez")
          )
        ),

        el("div", { class: "form-group" },
          el("label", { for: "topic-dispositivo" }, "Dispositivo Asociado"),
          el("input", {
            type: "text",
            id: "topic-dispositivo",
            name: "dispositivo_asociado",
            value: topic?.dispositivo_asociado || "",
            placeholder: "ID del dispositivo (opcional)"
          })
        ),

        el("div", { class: "form-group" },
          el("label", { for: "topic-metadatos" }, "Metadatos (JSON)"),
          el("textarea", {
            id: "topic-metadatos",
            name: "metadatos",
            value: topic?.metadatos ? JSON.stringify(topic.metadatos, null, 2) : "{}",
            placeholder: '{"unit": "celsius", "precision": 2}',
            rows: "3"
          })
        )
      ),

      el("div", { class: "form-actions" },
        el("button", {
          type: "submit",
          class: "btn btn-primary"
        }, isCreating ? "Crear Tópico" : "Actualizar Tópico")
      )
    );

    formContainer.innerHTML = "";
    formContainer.appendChild(form);
    formContainer.style.display = "block";
  };

  // Función para ocultar el formulario
  const hideTopicForm = () => {
    const formContainer = document.getElementById("topic-form-container");
    if (formContainer) {
      formContainer.style.display = "none";
      formContainer.innerHTML = "";
    }
    editingTopic = null;
    isCreating = false;
  };

  // Función para manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const topicData = {
      nombre: formData.get("nombre"),
      descripcion: formData.get("descripcion"),
      tipo_datos: formData.get("tipo_datos"),
      qos_level: parseInt(formData.get("qos_level")),
      dispositivo_asociado: formData.get("dispositivo_asociado") || null,
      metadatos: {}
    };

    // Parsear metadatos JSON
    try {
      const metadatosText = formData.get("metadatos");
      if (metadatosText && metadatosText.trim() !== "") {
        topicData.metadatos = JSON.parse(metadatosText);
      }
    } catch (error) {
      showError("Error en formato JSON de metadatos: " + error.message);
      return;
    }

    try {
      if (isCreating) {
        await ConfigAPI.createMQTTTopic(topicData);
        showSuccess("Tópico creado exitosamente");
      } else {
        await ConfigAPI.updateMQTTTopic(editingTopic.id, topicData);
        showSuccess("Tópico actualizado exitosamente");
      }
      
      hideTopicForm();
      await loadTopics();
      await mqttTopicsService.refreshTopics(); // Actualizar cache
      
    } catch (error) {
      console.error("Error guardando tópico:", error);
      showError("Error guardando tópico: " + error.message);
    }
  };

  // Función para editar un tópico
  const editTopic = (topic) => {
    showTopicForm(topic);
  };

  // Función para eliminar un tópico
  const deleteTopic = async (topic) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el tópico "${topic.nombre}"?\n\nEsta acción marcará el tópico como inactivo.`)) {
      return;
    }

    try {
      await ConfigAPI.deleteMQTTTopic(topic.id);
      showSuccess("Tópico eliminado exitosamente");
      await loadTopics();
      await mqttTopicsService.refreshTopics(); // Actualizar cache
    } catch (error) {
      console.error("Error eliminando tópico:", error);
      showError("Error eliminando tópico: " + error.message);
    }
  };

  // Función para mostrar mensajes de éxito
  const showSuccess = (message) => {
    const alert = el("div", { 
      class: "alert alert-success",
      style: "position: fixed; top: 20px; right: 20px; z-index: 1000;"
    }, message);
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  };

  // Función para mostrar mensajes de error
  const showError = (message) => {
    const alert = el("div", { 
      class: "alert alert-error",
      style: "position: fixed; top: 20px; right: 20px; z-index: 1000;"
    }, message);
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  };

  // Crear el componente principal
  const container = el("div", { class: "mqtt-topics-manager" },
    el("div", { class: "card" },
      el("div", { class: "card-header" },
        el("h3", {}, "Gestión de Tópicos MQTT"),
        el("div", { class: "header-actions" },
          el("button", {
            class: "btn btn-primary",
            onClick: () => showTopicForm()
          }, "➕ Crear Tópico"),
          el("button", {
            class: "btn btn-outline",
            onClick: loadTopics
          }, "🔄 Actualizar")
        )
      ),

      el("div", { class: "card-body" },
        el("div", { class: "table-responsive" },
          el("table", { class: "table" },
            el("thead", {},
              el("tr", {},
                el("th", {}, "Nombre"),
                el("th", {}, "Descripción"),
                el("th", {}, "Tipo"),
                el("th", {}, "QoS"),
                el("th", {}, "Dispositivo"),
                el("th", {}, "Estado"),
                el("th", {}, "Acciones")
              )
            ),
            el("tbody", { id: "topics-table-body" })
          )
        )
      )
    ),

    el("div", { 
      id: "topic-form-container",
      class: "card",
      style: "display: none; margin-top: 20px;"
    })
  );

  // Cargar tópicos al inicializar
  setTimeout(loadTopics, 100);

  return container;
}

// Agregar estilos CSS para el componente
const style = document.createElement('style');
style.textContent = `
  .mqtt-topics-manager .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .mqtt-topics-manager .header-actions {
    display: flex;
    gap: 10px;
  }

  .mqtt-topics-manager .table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  .mqtt-topics-manager .table th,
  .mqtt-topics-manager .table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  .mqtt-topics-manager .table th {
    background-color: #f8f9fa;
    font-weight: bold;
  }

  .mqtt-topics-manager .badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .mqtt-topics-manager .badge-primary { background-color: #007bff; color: white; }
  .mqtt-topics-manager .badge-info { background-color: #17a2b8; color: white; }
  .mqtt-topics-manager .badge-warning { background-color: #ffc107; color: black; }
  .mqtt-topics-manager .badge-secondary { background-color: #6c757d; color: white; }
  .mqtt-topics-manager .badge-danger { background-color: #dc3545; color: white; }

  .mqtt-topics-manager .status-active {
    color: #28a745;
    font-weight: bold;
  }

  .mqtt-topics-manager .status-inactive {
    color: #dc3545;
    font-weight: bold;
  }

  .mqtt-topics-manager .actions {
    display: flex;
    gap: 5px;
  }

  .mqtt-topics-manager .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .mqtt-topics-manager .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }

  .mqtt-topics-manager .form-group {
    display: flex;
    flex-direction: column;
  }

  .mqtt-topics-manager .form-group label {
    margin-bottom: 5px;
    font-weight: bold;
  }

  .mqtt-topics-manager .form-group input,
  .mqtt-topics-manager .form-group select,
  .mqtt-topics-manager .form-group textarea {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .mqtt-topics-manager .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .mqtt-topics-manager .alert {
    padding: 12px 16px;
    border-radius: 4px;
    font-weight: bold;
  }

  .mqtt-topics-manager .alert-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .mqtt-topics-manager .alert-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
`;
document.head.appendChild(style);
