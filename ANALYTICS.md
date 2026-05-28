# Analytics (GA4) en AutoSelect Pro (MV3)

Este proyecto usa `Google Analytics 4` mediante `Measurement Protocol` desde `background.js`.

## Por qué no se usa el snippet de `gtag.js`

Chrome Extensions Manifest V3 no permite ejecutar scripts remotos en páginas de la extensión (`popup`, `options`, etc.), por lo que el snippet clásico:

```html
<script async src="https://www.googletagmanager.com/gtag/js?..."></script>
```

no es compatible en este contexto.

## Configuración

1. Abrir `Opciones` > `Licencia` > `Configuración avanzada`.
2. Completar:
   - `GA4 Measurement ID` (ej: `G-NSVS9FVVG8`)
   - `GA4 API Secret` (Measurement Protocol secret)
3. Guardar configuración.

Si falta el `API Secret`, los eventos GA4 se omiten sin romper la extensión.

## Eventos enviados

- `page_view` desde `popup`, `options` y `pdf-viewer`.
- Eventos de negocio que ya pasan por `TRACK_EVENT` / `postEvent`.
