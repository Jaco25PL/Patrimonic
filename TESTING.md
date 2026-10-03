# Plan de testing — Huella

Todo corre **local**, contra un build de producción (`next build && next start`), nunca contra prod.

```bash
npm test          # unit + integridad de datos (Vitest, ~2 s)
npm run test:e2e  # end-to-end en iPhone, Android y desktop (Playwright, ~2 min)
npm run test:all
```
El E2E arma su propio build con **fotos de prueba** (`tests/fixtures/photos.e2e.json`): una que carga bien y una
URL rota a propósito, para verificar el fallback. Al terminar restaura el archivo real.

## 1. Integridad de datos (`tests/unit/data.test.ts`)
| Qué se verifica | Por qué |
|---|---|
| 491 lugares, 19 departamentos | que el parser del PDF no pierda ni duplique lugares |
| slugs únicos y URL-safe | cada lugar tiene su página estable |
| nombre, depto válido, localidad, días y categoría en todos | ninguna ficha rota |
| direcciones presentes (≤ 4 faltantes) y que no sean frases | "Cómo llegar" necesita una dirección real |
| ningún lugar sin programa | |
| cada slug de `photo-sources.json` existe | una foto mal asignada no queda huérfana |

## 2. Lógica de dominio (`tests/unit/domain.test.ts`)
Búsqueda sin tildes/mayúsculas y multi-palabra · filtros por día, departamento, categoría, guardados y combinados ·
agrupado por localidad · URL de Google Maps (codificación, sin duplicados, dirección nula) · día del evento en hora de
Montevideo (incluye el borde de medianoche UTC) · parser del programa (días, horarios, duplicados, "Domingo Cullen" ≠ domingo).

## 3. End-to-end (`tests/e2e/`) — en iPhone 14 Pro, Pixel 7 y desktop
- **Home**: carga 491 lugares sin errores de consola · Imperdibles solo con foto y en orden · sin scroll horizontal a 320 px · buscador fijo al scrollear · botones con nombre accesible e imágenes con `alt`.
- **Filtros**: búsqueda con tildes · borrar búsqueda · Sábado/Domingo (y que el domingo no muestre los "solo sábado") · departamento · categoría · estado vacío + reset · los filtros se mantienen al entrar a un lugar y volver.
- **Ficha**: título, programa, organizador · **Cómo llegar** visible, abre pestaña nueva hacia `google.com/maps/dir/?api=1&destination=…` · foto OK + crédito y licencia · foto rota → póster ilustrado · lugar sin foto → póster sin crédito · entrar por link directo y tocar Volver → home · lugares cercanos · compartir copia el link (fallback sin Web Share) · 404 amigable · metadatos OG.
- **Mi recorrido**: guardar, ver en el filtro, persiste al recargar, quitar.
- **PWA**: manifest instalable con íconos PNG 192/512/maskable · viewport-fit=cover y sin bloqueo de zoom · theme-color claro/oscuro · **funciona offline** tras la primera visita.
- **Rutas**: las 491 fichas responden 200 y tienen el botón Cómo llegar.

## 4. Build
- `scripts/resolve-photos.mjs` sin red → avisa y **no rompe el build** (verificado).
- `tsc --noEmit` limpio.

## 5. Manual en dispositivo real (no automatizable)
- [ ] iPhone (Safari): Instalar → Compartir → Agregar a inicio; abre a pantalla completa, notch y barra inferior bien.
- [ ] Android (Chrome): botón "Instalar app" muestra el prompt nativo.
- [ ] Cómo llegar abre la **app** de Google Maps (o Maps web) con la ruta correcta en 3–4 lugares de distintos departamentos.
- [ ] Fotos reales en prod: revisar Imperdibles y ~10 fichas (que la foto sea del lugar correcto).
- [ ] Modo avión después de usarla: la home y fichas visitadas abren.
- [ ] Modo oscuro y "Reducir movimiento" del sistema.
