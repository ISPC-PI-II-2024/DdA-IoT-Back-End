// ==========================
// 404
// ==========================
import { el } from "../utils/dom.js";

export async function render() {
  return el("div", { class: "container" },
    el("div", { class: "card" },
      el("h2", {}, "404"),
      el("p", { class: "muted" }, "La ruta no existe.")
    )
  );
}
