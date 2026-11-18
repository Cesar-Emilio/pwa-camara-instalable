# PWA Cámara Instalable

Práctica de los temas 6.1 y 6.2 de *Desarrollo de Aplicaciones Web Progresivas*: instalabilidad nativa con `manifest.json` y acceso ético a la cámara frontal/trasera con un flujo de Pre-Permiso.

**Demo (GitHub Pages):** https://cesar-emilio.github.io/pwa-camara-instalable/

## Estructura

```
pwa-camara-instalable/
├── index.html      # Interfaz, aviso de pre-permiso, guía iOS, <video playsinline>
├── styles.css
├── app.js          # Instalación, detección iOS, control de cámara (solo .then/.catch/.finally)
├── sw.js           # Service Worker con estrategia Cache First
├── manifest.json   # Identidad, colores, standalone, iconos con rutas relativas
└── icons/
    ├── icon-192.png   # 192x192 px
    └── icon-512.png   # 512x512 px
```

## Funcionalidad

- **Instalación (Chrome/Android):** se intercepta `beforeinstallprompt` y se muestra `#btn-instalar`; al pulsarlo se llama `prompt()` y `userChoice.then(...)` oculta el botón si se acepta.
- **Instalación (iOS/Safari):** si el dispositivo es iOS y no está en modo `standalone`, se muestra `#instrucciones-ios` (Compartir → Agregar a inicio).
- **Pre-Permiso UX:** `#btn-preparar-camara` solo muestra `#aviso-permiso`; `getUserMedia()` se ejecuta únicamente tras pulsar `#btn-confirmar-permiso`.
- **Control de hardware:** `#btn-alternar-camara` cambia entre `environment` y `user`; `#btn-apagar-camara` libera el sensor. Antes de cada solicitud se detienen todas las pistas con `track.stop()`.
- **Diagnóstico de errores:** `NotAllowedError`, `NotFoundError`, `NotReadableError` y genéricos.

## Despliegue

Settings → Pages → *Deploy from a branch* → rama con el código, carpeta `/ (root)`.
