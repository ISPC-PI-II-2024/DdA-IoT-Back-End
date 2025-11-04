// ==========================
// PWA Installation Handler
// Maneja la instalación de la aplicación como PWA
// ==========================

let deferredPrompt;
let installButton;

// Detectar cuando la app es instalable
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA instalable detectada');
  // Prevenir que Chrome muestre el banner automático
  e.preventDefault();
  // Guardar el evento para usarlo después
  deferredPrompt = e;
  
  // Mostrar botón de instalación si existe
  installButton = document.getElementById('install-button');
  if (installButton) {
    installButton.style.display = 'block';
    installButton.addEventListener('click', installApp);
  }
});

// Manejar la instalación
async function installApp() {
  if (deferredPrompt) {
    // Mostrar el prompt de instalación
    deferredPrompt.prompt();
    
    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuario ${outcome} la instalación`);
    
    // Limpiar el prompt
    deferredPrompt = null;
    
    // Ocultar el botón de instalación
    if (installButton) {
      installButton.style.display = 'none';
    }
  }
}

// Detectar cuando la app fue instalada
window.addEventListener('appinstalled', () => {
  console.log('PWA instalada exitosamente');
  deferredPrompt = null;
  
  // Ocultar el botón de instalación
  if (installButton) {
    installButton.style.display = 'none';
  }
});

// Detectar si la app se está ejecutando como PWA instalada
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('Ejecutándose como PWA instalada');
  // Aquí puedes agregar lógica específica para cuando la app está instalada
}

// Detectar cambios en el modo de visualización
window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
  if (e.matches) {
    console.log('Cambió a modo standalone (PWA instalada)');
  } else {
    console.log('Cambió a modo navegador');
  }
});

// Exportar función para uso manual
window.installPWA = installApp;
