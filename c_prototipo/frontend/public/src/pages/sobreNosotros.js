// ==========================
// Página pública
// ==========================
import { el } from "../utils/dom.js";
import { UsersAPI } from "../api.js";

export async function render() {
  const headerCard = el("div", { class: "card" },
    el("h2", {}, "ISPC Desarrollo Aplicaciones"),
    el("p", {}, "Web modular para administración y visualización de proyectos IoT, productos del modulo 2do año, Desarrollo de Aplicaciones."),
    el("p", { class: "muted" }, "Robusto en vanilla JS, integrable con OAuth, WebSockets y PWA."),
    el("p", { class: "muted" }, "Se utilizara esta pagina y apartado, una vez conectado con la BD para mostrar y conectar con redes sociales de los estudiantes y profesores involucrados en el desarrollo del proyecto")
  );

  // Contenedor para los bloques de tecnicaturas
  const tecnicaturasContainer = el("div", {
    id: "tecnicaturas-container",
    style: "margin-top: var(--espaciado-xl);"
  });

  // Cargar usuarios agrupados por tecnicatura
  // Solo se consulta cuando se abre este apartado (no hay auto-refresh)
  // Cache de 1 hora para evitar consultas innecesarias a la DB
  try {
    const response = await UsersAPI.getUsersByTecnicatura();
    
    if (response.success && response.data) {
      const tecnicaturas = Object.keys(response.data).sort();
      
      if (tecnicaturas.length === 0) {
        tecnicaturasContainer.appendChild(
          el("div", { class: "card" },
            el("p", { 
              class: "text-center muted",
              style: "padding: var(--espaciado-xl);"
            }, "No hay usuarios registrados aún.")
          )
        );
      } else {
        tecnicaturas.forEach(tecnicatura => {
          const usuarios = response.data[tecnicatura];
          
          // Crear bloque para cada tecnicatura
          const tecnicaturaCard = el("div", { 
            class: "card",
            style: "margin-bottom: var(--espaciado-lg);"
          },
            el("h3", {
              style: "margin-bottom: var(--espaciado-md); padding-bottom: var(--espaciado-sm); border-bottom: 2px solid var(--color-acento);"
            }, tecnicatura),
            el("div", { class: "users-list" },
              ...usuarios.map(usuario => {
                const userItem = el("div", {
                  class: "user-item"
                });

                // Si tiene foto, mostrarla
                if (usuario.foto_url) {
                  userItem.appendChild(
                    el("img", {
                      src: usuario.foto_url,
                      alt: usuario.nombre
                    })
                  );
                } else {
                  // Avatar por defecto
                  userItem.appendChild(
                    el("div", {
                      class: "user-avatar"
                    }, usuario.nombre.charAt(0).toUpperCase())
                  );
                }

                // Nombre con link a GitHub si existe
                const nameElement = usuario.github && usuario.github.trim() !== ""
                  ? el("a", {
                      href: usuario.github.startsWith("http") ? usuario.github : `https://github.com/${usuario.github}`,
                      target: "_blank",
                      rel: "noopener noreferrer"
                    }, 
                      el("span", {}, usuario.nombre),
                      el("span", { 
                        style: "opacity: 0.7; font-size: 0.9em;"
                      }, "🔗")
                    )
                  : el("span", {
                      style: "color: var(--color-texto); font-weight: 500; flex: 1;"
                    }, usuario.nombre);

                userItem.appendChild(nameElement);

                return userItem;
              })
            )
          );

          tecnicaturasContainer.appendChild(tecnicaturaCard);
        });
      }
    } else {
      tecnicaturasContainer.appendChild(
        el("div", { class: "card card-error" },
          el("p", { 
            class: "text-center",
            style: "padding: var(--espaciado-xl); color: var(--color-error);"
          }, "Error al cargar los usuarios. Por favor, intenta más tarde.")
        )
      );
    }
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    tecnicaturasContainer.appendChild(
      el("div", { class: "card card-error" },
        el("p", { 
          class: "text-center",
          style: "padding: var(--espaciado-xl); color: var(--color-error);"
        }, "Error al cargar los usuarios. Por favor, intenta más tarde.")
      )
    );
  }

  return el("div", { class: "container" },
    headerCard,
    tecnicaturasContainer
  );
}
