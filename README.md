# Huella — Guía del Día del Patrimonio 2026

App web instalable (PWA) con los **491 lugares** que abren el 3 y 4 de octubre de 2026 en todo Uruguay: foto, programa, horarios y botón **Cómo llegar** (Google Maps).

## Stack
- **Next.js 16** (App Router, Turbopack) + **React 19**, todo pre-renderizado estático (SSG): 1 home + 491 páginas de lugar.
- **Tailwind CSS v4** con tokens propios (tipografía del sistema/SF, materiales translúcidos, modo oscuro, reduced-motion/transparency).
- `next/image` → AVIF/WebP optimizado por Vercel desde Wikimedia Commons.
- Service worker propio (`public/sw.js`): funciona con poca señal; manifest + íconos generados con `next/og`.
- Cero dependencias de UI en runtime: solo `next`, `react`, `react-dom`.

## Arquitectura
```
scripts/parse_guide.py     PDF oficial → data/raw-guide.json (usa la jerarquía tipográfica del PDF)
scripts/build_data.py      normaliza, deduplica, categoriza → src/data/places.json (correcciones en data/fixes.json)
scripts/resolve-photos.mjs data/photo-sources.json → src/data/photos.generated.json (corre en `prebuild`)
src/domain/                lógica pura: tipos, filtros (predicados componibles), programa, Maps, categorías
src/data/repository.ts     repositorio server-only (único acceso a datos)
src/features/explorer/     home: búsqueda, filtros, imperdibles, listado
src/features/place/        detalle: acciones, barra "Cómo llegar"
src/components/            primitivas UI (Icon, SegmentedControl, PlacePhoto, Poster…)
src/hooks/createStore.ts   store observable + Web Storage (favoritos y filtros) vía useSyncExternalStore
src/config/site.ts         nombre/branding en un solo lugar
```

## Fotos
Las fotos salen de **Wikimedia Commons** (licencias libres, con crédito en cada lugar). En el build se verifica cada archivo/categoría
con la API de Commons; si alguna no existe, ese lugar usa un póster ilustrado inspirado en los pictogramas de Chamangá.
Para agregar o cambiar una foto: editar `data/photo-sources.json` (clave = slug del lugar).

## Desarrollo
```bash
npm install
npm run photos   # opcional: resuelve fotos (requiere internet)
npm run dev
```

## Deploy en Vercel
Importar el repo en Vercel (framework Next.js detectado automáticamente, sin variables obligatorias).
Opcional: `NEXT_PUBLIC_SITE_URL` con el dominio final para los links al compartir.
