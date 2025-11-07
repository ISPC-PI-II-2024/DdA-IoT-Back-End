// ==========================
// Dashboard Simplificado - Versión de Prueba
// Para aislar el problema del SyntaxError
// ==========================

import { el } from "../utils/dom.js";
import { getState } from "../state/store.js";

export async function render() {
  try {
    const state = getState();
    const role = state.role;
    const currentProject = state.currentProject;
    
    const header = el("div", { 
      id: "dashboard-header",
      class: "dashboard-section dashboard-header card card-feature" 
    },
      el("h2", { class: "text-2xl font-bold mb-2" }, "Panel de dispositivos IoT"),
      el("p", { class: "muted text-lg" }, `Proyecto actual: ${currentProject || "—"}`)
    );

    const dashboardContainer = el("div", { class: "dashboard-container" });
    dashboardContainer.appendChild(header);

    const pageContainer = el("div", {});
    pageContainer.appendChild(dashboardContainer);
    
    return pageContainer;
  } catch (error) {
    console.error('[Dashboard] Error crítico en render():', error);
    console.error('[Dashboard] Stack trace:', error.stack);
    
    const errorContainer = el("div", { class: "container" },
      el("div", { class: "card", style: "text-align: center; padding: 40px; margin-top: 40px;" },
        el("div", { style: "font-size: 4em; margin-bottom: 20px;" }, "❌"),
        el("h1", { style: "margin-bottom: 15px; color: #d32f2f;" }, "Error al cargar el Dashboard"),
        el("p", { style: "margin-bottom: 20px; color: #666;" }, 
          error.message || "Ha ocurrido un error inesperado al cargar el dashboard."
        )
      )
    );
    
    return errorContainer;
  }
}

