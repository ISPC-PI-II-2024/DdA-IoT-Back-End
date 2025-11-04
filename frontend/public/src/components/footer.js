// ==========================
// Componente Footer - Vanilla JS
// ==========================
export function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';

  // Mapa del sitio
  const sitemap = `
    <nav class="footer-sitemap">
      <a href="#/dashboard">Inicio</a>
      <a href="#/sobre-nosotros">Sobre Nosotros</a>
      <a href="#/login">Acceso</a>
    </nav>
  `;

  // Derechos y aclaraciones
  const copyright = `
    <div class="footer-copy">
      &copy; ${new Date().getFullYear()} ISPC Tecnicatura Superior en Telecomunicaciones - Cohorte 2024. Todos los derechos reservados.<br>
      <span class="footer-legal">* Para uso interno. No compartir credenciales.</span>
    </div>
  `;

  // Redes sociales/contacto
  const social = `
    <div class="footer-social">
      <a href="https://www.ispc.edu.ar/" title="Pagina Principal"><img src="icons/ISPC-logo.png" alt="link"></a>
      <a href="https://github.com/ISPC-PI-II-2024" target="_blank" title="Github"><img src="icons/github.png" alt="Github"></a>
      <a href="https://www.linkedin.com/school/ispc-instituto-superior-polit-cnico-c-rdoba" target="_blank" title="LinkedIn"><img src="icons/linkedin.png" alt="LinkedIn"></a>
    </div>
  `;

  footer.innerHTML = `
    <div class="footer-content">
      ${sitemap}
      ${copyright}
      ${social}
    </div>
  `;

  return footer;
}
