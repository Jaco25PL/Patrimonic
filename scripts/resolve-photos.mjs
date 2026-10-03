// Resolves data/photo-sources.json against the Wikimedia Commons API and writes
// src/data/photos.generated.json with optimized thumbnail URLs, dimensions,
// a tiny blur placeholder and attribution (author + license) for every place.
//
// Runs automatically before `next build`. It never fails the build: if Commons
// is unreachable, the previously generated file is kept and places without a
// photo fall back to the illustrated poster.

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = process.env.PHOTOS_SOURCES ?? path.join(ROOT, "data/photo-sources.json");
const OUTPUT = process.env.PHOTOS_OUTPUT ?? path.join(ROOT, "src/data/photos.generated.json");
const PLACES = process.env.PHOTOS_PLACES ?? path.join(ROOT, "src/data/places.json");
const PHOTO_DIR = process.env.PHOTOS_DIR ?? path.join(ROOT, "public/photos");

const API = process.env.COMMONS_API ?? "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "HuellaPatrimonio/1.0 (https://github.com/jaco25pl/patrimonic)";
const THUMB_WIDTH = 1280; // a standard Wikimedia thumbnail step
const BLUR_WIDTH = 40;
const AVOID = /(interior|detalle|detail|placa|plaque|plano|mapa|map|logo|escudo|coat|firma|signature|\.svg|\.png|\.tif)/i;

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  return res.json();
}

const IMAGEINFO = {
  prop: "imageinfo",
  iiprop: "url|size|mime|extmetadata",
  iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|Categories|ImageDescription",
  iiurlwidth: String(THUMB_WIDTH),
};

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function toPhoto(page) {
  const info = page?.imageinfo?.[0];
  if (!info || !/jpe?g/.test(info.mime ?? "")) return null;
  const meta = info.extmetadata ?? {};
  return {
    src: info.thumburl ?? info.url,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    originalWidth: info.width,
    originalHeight: info.height,
    author: stripHtml(meta.Artist?.value) || "Wikimedia Commons",
    license: meta.LicenseShortName?.value ?? null,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    page: info.descriptionurl,
    title: page.title,
    context: `${page.title} ${meta.Categories?.value ?? ""} ${stripHtml(meta.ImageDescription?.value)}`,
  };
}

// ── Automatic search for places without a hand-picked photo ──────────────────
// Precision over recall: a missing photo shows the illustrated poster, a wrong
// photo misleads people. A result is accepted only when its file title carries
// the place's distinctive name words AND its metadata places it in Uruguay.

const norm = (t = "") => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const GENERIC = new Set(
  ("de del la las los el y e en a al n nro no sede espacio centro cultural casa museo sala club escuela iglesia parroquia " +
    "capilla nacional historico historica municipal departamental plaza parque biblioteca instituto asociacion sociedad " +
    "uruguay uruguayo uruguaya colegio liceo local comision fomento muestra visita recorrido exposicion taller arte " +
    "nuestra senora san santa santo dr prof gral general mtro ing arq y/o udelar intendencia municipio direccion " +
    "edificio antiguo ex hall predio galpon")
    .split(" "),
);
const TYPES = ["museo", "teatro", "iglesia", "parroquia", "capilla", "catedral", "basilica", "castillo", "palacio", "faro", "estadio", "cementerio", "mercado", "estacion", "fortaleza", "fuerte", "molino", "hotel", "bodega", "quinta"];

export function distinctiveTokens(name) {
  return [...new Set(norm(name).split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !GENERIC.has(t) && !/^\d+$/.test(t)))];
}

export function acceptsAuto(place, photo) {
  const title = norm(photo.title);
  const tokens = distinctiveTokens(place.name);
  if (!tokens.length) return false;
  const hits = tokens.filter((t) => title.includes(t)).length;
  if (tokens.length <= 2 ? hits < tokens.length : hits / tokens.length < 0.6) return false;
  const type = TYPES.find((t) => norm(place.name).startsWith(t) || norm(place.name).includes(` ${t} `));
  if (type && !title.includes(type)) return false;
  if (AVOID.test(photo.title)) return false;
  const context = norm(photo.context);
  return [place.locality, place.dept, "uruguay", "montevideo"].some((w) => context.includes(norm(w)));
}

async function resolveAuto(place) {
  const where = place.locality === place.dept ? place.dept : `${place.locality} ${place.dept}`;
  const data = await api({
    action: "query",
    generator: "search",
    gsrsearch: `${place.name} ${where}`,
    gsrnamespace: "6",
    gsrlimit: "10",
    ...IMAGEINFO,
  });
  const photos = (data.query?.pages ?? []).map(toPhoto).filter((p) => p && acceptsAuto(place, p));
  photos.sort((a, b) => score(b) - score(a));
  return photos[0] ?? null;
}

/** Runs `fn` over `items` with at most `n` in flight (polite to the Commons API). */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]).catch(() => null);
      }
    }),
  );
  return out;
}

function score(photo) {
  const ratio = photo.originalWidth / photo.originalHeight;
  let s = Math.min(photo.originalWidth, 4000) / 1000;
  if (ratio >= 1.2 && ratio <= 2) s += 3; // landscape reads best as a hero
  if (ratio < 0.9) s -= 1.5;
  if (AVOID.test(photo.title)) s -= 5;
  if (/fachada|facade|vista|view/i.test(photo.title)) s += 1;
  return s;
}

async function resolveFiles(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await api({ action: "query", titles: batch.join("|"), redirects: "1", ...IMAGEINFO });
    const alias = new Map();
    for (const n of data.query?.normalized ?? []) alias.set(n.to, n.from);
    for (const r of data.query?.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);
    for (const page of data.query?.pages ?? []) {
      const photo = toPhoto(page);
      if (photo) out.set(alias.get(page.title) ?? page.title, photo);
    }
  }
  return out;
}

async function resolveCategory(category) {
  const data = await api({
    action: "query",
    generator: "categorymembers",
    gcmtitle: category,
    gcmtype: "file",
    gcmlimit: "50",
    ...IMAGEINFO,
  });
  const photos = (data.query?.pages ?? []).map(toPhoto).filter(Boolean);
  photos.sort((a, b) => score(b) - score(a));
  return photos[0] ?? null;
}

/**
 * Downloads the thumbnail into /public/photos so the app serves (and Vercel optimizes) it
 * from our own domain: no hotlinking, no dependency on Wikimedia's thumbnail hosts at runtime.
 */
async function download(slug, src) {
  try {
    const res = await fetch(src, { headers: { "User-Agent": USER_AGENT } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) throw new Error(`${res.status} ${type}`);
    const file = `${slug}.jpg`;
    await writeFile(path.join(PHOTO_DIR, file), Buffer.from(await res.arrayBuffer()));
    return `/photos/${file}`;
  } catch (error) {
    console.warn(`  · no se pudo descargar ${slug} (${error.message}); se usa la URL remota`);
    return src;
  }
}

async function blurDataUrl(src) {
  const small = src.replace(/\/\d+px-/, `/${BLUR_WIDTH}px-`);
  if (small === src) return null;
  try {
    const res = await fetch(small, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function main() {
  const { places: sources } = JSON.parse(await readFile(SOURCES, "utf8"));
  const entries = Object.entries(sources);

  await rm(PHOTO_DIR, { recursive: true, force: true });
  await mkdir(PHOTO_DIR, { recursive: true });

  const fileTitles = [...new Set(entries.flatMap(([, list]) => list.filter((s) => s.startsWith("File:"))))];
  const files = await resolveFiles(fileTitles);

  const chosen = new Map();
  for (const [slug, candidates] of entries) {
    for (const candidate of candidates) {
      const photo = candidate.startsWith("Category:") ? await resolveCategory(candidate).catch(() => null) : files.get(candidate);
      if (photo) {
        chosen.set(slug, photo);
        break;
      }
    }
    if (!chosen.has(slug)) console.warn(`  · sin foto curada: ${slug}`);
  }
  const curated = chosen.size;

  // Every other place: automatic search with strict acceptance rules.
  const places = JSON.parse(await readFile(PLACES, "utf8"));
  const pending = places.filter((p) => !chosen.has(p.slug));
  const found = await pool(pending, 6, resolveAuto);
  const usedFiles = new Set([...chosen.values()].map((p) => p.title));
  pending.forEach((place, i) => {
    const photo = found[i];
    if (!photo || usedFiles.has(photo.title)) return; // never reuse one photo for two places
    usedFiles.add(photo.title);
    chosen.set(place.slug, { ...photo, auto: true });
  });

  const result = {};
  await pool([...chosen], 6, async ([slug, photo]) => {
    const { originalWidth, originalHeight, title, context, ...rest } = photo;
    result[slug] = { ...rest, src: await download(slug, photo.src), blur: await blurDataUrl(photo.src) };
  });

  await writeFile(OUTPUT, JSON.stringify(result, null, 1) + "\n");
  console.log(`✓ fotos: ${curated}/${entries.length} curadas + ${chosen.size - curated} automáticas = ${Object.keys(result).length}/${places.length} lugares con foto`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(async (error) => {
  console.warn(`⚠ No se pudieron resolver las fotos (${error.message}). Se mantiene el archivo existente.`);
  try {
    await readFile(OUTPUT);
  } catch {
    await writeFile(OUTPUT, "{}\n");
  }
});
