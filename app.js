// =====================================================================
// Inspección Visual PWA - Instalabilidad y acceso ético a la cámara
// JavaScript Vanilla. Sin async/await: toda la asincronía usa
// .then(), .catch() y .finally().
// =====================================================================

// ---------------------------------------------------------------------
// Referencias a la interfaz
// ---------------------------------------------------------------------
const btnInstalar = document.getElementById('btn-instalar');
const btnPrepararCamara = document.getElementById('btn-preparar-camara');
const btnConfirmarPermiso = document.getElementById('btn-confirmar-permiso');
const btnCancelarPermiso = document.getElementById('btn-cancelar-permiso');
const btnAlternarCamara = document.getElementById('btn-alternar-camara');
const btnApagarCamara = document.getElementById('btn-apagar-camara');
const avisoPermiso = document.getElementById('aviso-permiso');
const avisoLente = document.getElementById('aviso-lente');
const visorVideo = document.getElementById('visor-camara');
const visorVacio = document.getElementById('visor-vacio');
const mensajeEstado = document.getElementById('mensaje-estado');
const modoVisualizacion = document.getElementById('modo-visualizacion');

// ---------------------------------------------------------------------
// Estado de la aplicación
// ---------------------------------------------------------------------
let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal
let solicitudEnCurso = false;

function nombreLente(modo) {
  return modo === 'environment' ? 'Trasera' : 'Frontal';
}

function actualizarMensajeEstado(texto) {
  mensajeEstado.textContent = texto;
}

function actualizarControles() {
  const camaraEncendida = streamActual !== null;
  btnPrepararCamara.disabled = solicitudEnCurso || camaraEncendida;
  btnAlternarCamara.disabled = solicitudEnCurso || !camaraEncendida;
  btnApagarCamara.disabled = solicitudEnCurso || !camaraEncendida;
  visorVacio.hidden = camaraEncendida;
}

// =====================================================================
// FASE 1: INSTALABILIDAD
// =====================================================================

function estaInstaladaComoApp() {
  return window.navigator.standalone === true ||
         window.matchMedia('(display-mode: standalone)').matches;
}

// Fragmento B: captura del evento de instalación (Chrome / Android)
window.addEventListener('beforeinstallprompt', (event) => {
  // Evita que el mini-banner automático aparezca antes de tiempo
  event.preventDefault();
  eventoInstalacionDiferido = event;

  // Muestra el botón personalizado de instalación en la UI
  btnInstalar.hidden = false;
});

// Desafío 1.2: botón propio de instalación
btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) {
    return;
  }

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
        actualizarMensajeEstado('Instalación aceptada. Abre la app desde tu pantalla de inicio.');
      } else {
        actualizarMensajeEstado('Instalación cancelada. Puedes instalarla más tarde.');
      }
    })
    .catch((error) => {
      console.error('[Instalación] Error en userChoice:', error);
    })
    .finally(() => {
      // El evento diferido solo puede usarse una vez
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
  console.log('[Instalación] PWA instalada correctamente.');
});

// Notas iOS: Safari nunca dispara beforeinstallprompt, se muestran
// instrucciones manuales (Compartir -> Agregar a inicio).
function verificarEntornoIOS() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  // iPadOS 13+ se identifica como Mac; se detecta por la pantalla táctil
  const esIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const estaInstalada = estaInstaladaComoApp();

  // Si está en iPhone/iPad y aún la ve desde el navegador, mostrar instrucciones
  if ((esIOS || esIPadOS) && !estaInstalada) {
    const guiaIOS = document.getElementById('instrucciones-ios');
    if (guiaIOS) guiaIOS.hidden = false;
  }
}

function mostrarModoVisualizacion() {
  modoVisualizacion.textContent = estaInstaladaComoApp()
    ? 'Modo: aplicación instalada (standalone)'
    : 'Modo: navegador';
}

// Registro del Service Worker (requisito de instalabilidad)
function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Este navegador no soporta Service Workers.');
    return;
  }

  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then((registro) => {
      console.log('[SW] Registrado con scope:', registro.scope);
    })
    .catch((error) => {
      console.error('[SW] Error al registrar:', error);
    });
}

// =====================================================================
// FASE 2: PRE-PERMISO Y CONTROL DE CÁMARA
// =====================================================================

// Fragmento C: liberación de hardware entre cambios de cámara
function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

// Fragmento D: encendido de cámara con promesas y diagnóstico de errores
function iniciarCamara(modo) {
  // Libera siempre el sensor activo antes de pedir otro (obligatorio en iOS)
  detenerCamaraActiva();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('Este navegador no permite acceder a la cámara. Verifica que la página se abra con HTTPS.');
    actualizarControles();
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  solicitudEnCurso = true;
  actualizarControles();
  actualizarMensajeEstado(`Solicitando cámara ${nombreLente(modo).toLowerCase()}...`);

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      visorVideo.classList.toggle('espejo', modo === 'user');
      actualizarMensajeEstado(`Cámara activa (${nombreLente(modo)})`);

      // Algunos navegadores (iOS) requieren invocar play() explícitamente
      const reproduccion = visorVideo.play();
      if (reproduccion && typeof reproduccion.catch === 'function') {
        reproduccion.catch((error) => {
          console.warn('[Cámara] No se pudo iniciar la reproducción automática:', error);
        });
      }
    })
    .catch((error) => {
      visorVideo.srcObject = null;
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else if (error.name === 'NotReadableError') {
        actualizarMensajeEstado('La cámara está ocupada por otra aplicación o no se liberó a tiempo. Intenta de nuevo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    })
    .finally(() => {
      solicitudEnCurso = false;
      actualizarControles();
    });
}

// Fragmento E: flujo de consentimiento previo (Pre-Permiso UX)
// Paso 1: el usuario pulsa "Solicitar Acceso a Cámara" -> se muestra el aviso
btnPrepararCamara.addEventListener('click', () => {
  avisoLente.textContent = nombreLente(modoCamaraActual).toLowerCase();
  avisoPermiso.hidden = false;
  avisoPermiso.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Paso 2: el usuario lee el motivo y pulsa "Aceptar y Encender Cámara"
btnConfirmarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  iniciarCamara(modoCamaraActual);
});

// El usuario puede rechazar en nuestra interfaz sin bloquear el permiso nativo
btnCancelarPermiso.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  actualizarMensajeEstado('No se solicitó el permiso. Puedes activarlo cuando quieras.');
});

// Desafío 2.3: alternar entre lente trasera y frontal
btnAlternarCamara.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  iniciarCamara(modoCamaraActual);
});

// Desafío 2.4: apagar la cámara y liberar el sensor
btnApagarCamara.addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  visorVideo.classList.remove('espejo');
  actualizarMensajeEstado('Cámara apagada. El sensor fue liberado.');
  actualizarControles();
});

// Libera la cámara si la página se oculta o se cierra
window.addEventListener('pagehide', () => {
  detenerCamaraActiva();
});

// ---------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------
registrarServiceWorker();
verificarEntornoIOS();
mostrarModoVisualizacion();
actualizarControles();
