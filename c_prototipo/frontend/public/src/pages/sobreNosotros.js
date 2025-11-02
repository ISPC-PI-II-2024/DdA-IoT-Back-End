// ==========================
// Página pública
// ==========================
import { el } from "../utils/dom.js";

export async function render() {
  return el("div", { class: "container" },
    el("div", { class: "card" },
      el("h2", {}, "ISPC Desarrollo Aplicaciones"),
      el("p", {}, "Web modular para administración y visualización de proyectos IoT, productos del modulo 2do año, Desarrollo de Aplicaciones."),
      el("p", { class: "muted" }, "Robusto en vanilla JS, integrable con OAuth, WebSockets y PWA."),
      el("p", { class: "muted" }, "Se utilizara esta pagina y apartado, una vez conectado con la BD para mostrar y conectar con redes sociales de los estudiantes y profesores involucrados en el desarrollo del proyecto")
    )
  );
}
