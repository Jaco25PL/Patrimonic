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
const WIKIPEDIA_API = process.env.WIKIPEDIA_API ?? "https://es.wikipedia.org/w/api.php";
const USER_AGENT = "HuellaPatrimonio/1.0 (https://github.com/jaco25pl/patrimonic)";
const THUMB_WIDTH = 1280; // a standard Wikimedia thumbnail step
const BLUR_WIDTH = 40;
const AVOID = /(interior|detalle|detail|placa|plaque|plano|mapa|map|logo|escudo|coat|firma|signature|\.svg|\.png|\.tif)/i;

async function api(params, base = API) {
  const url = `${base}?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
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

/** Name without the guide's suffixes: "Facultad de Química – Udelar" → "Facultad de Química". */
export function searchName(name) {
  return name
    .split(/\s[–—-]\s|\s\|\s|[(“"]/)[0]
    .replace(/[,.:;]+$/, "")
    .trim();
}

/**
 * Commons full-text search requires every word to match, so extra words kill recall.
 * Try the clean name first, then with the department, then with the locality.
 */
export function searchQueries(place) {
  const base = searchName(place.name);
  const quoted = place.name.match(/[“"]([^”"]{4,})[”"]/)?.[1]; // Museo Militar “Fortaleza General Artigas”
  return [...new Set([base, quoted, `${base} ${place.dept}`, `${base} ${place.locality}`].filter(Boolean))];
}

async function resolveAuto(place) {
  for (const query of searchQueries(place)) {
    const data = await api({ action: "query", generator: "search", gsrsearch: query, gsrnamespace: "6", gsrlimit: "10", ...IMAGEINFO });
    const photos = (data.query?.pages ?? []).map(toPhoto).filter((p) => p && acceptsAuto(place, p));
    photos.sort((a, b) => score(b) - score(a));
    if (photos[0]) return photos[0];
  }
  return null;
}


// ── Step 3: the lead image of the place's Spanish Wikipedia article ──────────
async function resolveWikipedia(place) {
  for (const query of searchQueries(place).slice(0, 2)) {
    const data = await api(
      {
        action: "query",
        generator: "search",
        gsrsearch: `${query} Uruguay`,
        gsrlimit: "5",
        prop: "pageimages|extracts",
        piprop: "name",
        exintro: "1",
        explaintext: "1",
        exlimit: "5",
        exchars: "600",
      },
      WIKIPEDIA_API,
    );
    const pages = (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const page of pages) {
      if (!page.pageimage) continue;
      // Same strict rules, judged on the article title + intro instead of a file name.
      const candidate = { title: page.title, context: `${page.title} ${page.extract ?? ""}` };
      if (!acceptsAuto(place, candidate)) continue;
      const files = await resolveFiles([`File:${page.pageimage}`]);
      const photo = files.get(`File:${page.pageimage}`) ?? [...files.values()][0];
      if (photo) return photo;
    }
  }
  return null;
}

// ── Steps 4–5: a real photo of the barrio / town, then of the department ────
function slugify(t) {
  return norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

async function searchZone(name, dept, max) {
  const tokens = distinctiveTokens(name);
  if (!tokens.length) return [];
  const queries = name === dept ? [`${name} Uruguay`, name] : [`${name} ${dept}`, `${name} Uruguay`];
  const found = new Map();
  for (const q of queries) {
    const data = await api({ action: "query", generator: "search", gsrsearch: q, gsrnamespace: "6", gsrlimit: "20", ...IMAGEINFO });
    for (const p of (data.query?.pages ?? []).map(toPhoto)) {
      if (!p || found.has(p.title) || AVOID.test(p.title)) continue;
      const title = norm(p.title);
      const context = norm(p.context);
      if (!tokens.every((t) => title.includes(t))) continue;
      if (![dept, "uruguay"].some((w) => context.includes(norm(w)))) continue;
      found.set(p.title, p);
    }
    if (found.size >= max) break;
  }
  return [...found.values()].sort((a, b) => score(b) - score(a)).slice(0, max);
}

const DEPT_CATEGORY = (dept) => (dept === "Montevideo" ? "Category:Montevideo" : `Category:${dept} Department`);

export async function resolveZones(places) {
  const byZone = new Map();
  for (const p of places) {
    const key = `${p.dept}/${p.locality}`;
    byZone.set(key, [...(byZone.get(key) ?? []), p]);
  }
  const deptPhotos = new Map();
  const deptFor = async (dept) => {
    if (!deptPhotos.has(dept)) {
      let photos = await searchZone(dept, dept, 6).catch(() => []);
      if (!photos.length) photos = [await resolveCategory(DEPT_CATEGORY(dept)).catch(() => null)].filter(Boolean);
      deptPhotos.set(dept, photos);
    }
    return deptPhotos.get(dept);
  };

  const out = new Map();
  for (const [, group] of byZone) {
    const { dept, locality } = group[0];
    let photos = locality === dept ? [] : await searchZone(locality, dept, Math.min(6, group.length)).catch(() => []);
    let zone = locality;
    if (!photos.length) {
      photos = await deptFor(dept);
      zone = dept;
    }
    group.forEach((place, i) => {
      const photo = photos[i % photos.length];
      if (photo) out.set(place.slug, { ...photo, zone });
    });
  }
  return out;
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
async function download(file, src) {
  try {
    const res = await fetch(src, { headers: { "User-Agent": USER_AGENT } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) throw new Error(`${res.status} ${type}`);
    await writeFile(path.join(PHOTO_DIR, file), Buffer.from(await res.arrayBuffer()));
    return `/photos/${file}`;
  } catch (error) {
    console.warn(`  · no se pudo descargar ${file} (${error.message}); se usa la URL remota`);
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

  const automatic = chosen.size - curated;

  // Step 3: Wikipedia article image.
  const noPhoto = places.filter((p) => !chosen.has(p.slug));
  const fromWiki = await pool(noPhoto, 6, resolveWikipedia);
  noPhoto.forEach((place, i) => {
    const photo = fromWiki[i];
    if (!photo || usedFiles.has(photo.title)) return;
    usedFiles.add(photo.title);
    chosen.set(place.slug, { ...photo, auto: true });
  });
  const wiki = chosen.size - curated - automatic;

  // Steps 4–5: illustrative photo of the zone, so no place is left without one.
  const zoned = await resolveZones(places.filter((p) => !chosen.has(p.slug)));
  for (const [slug, photo] of zoned) chosen.set(slug, { ...photo, auto: true });

  // Download each distinct file once (zone photos are shared).
  const targets = new Map();
  for (const [slug, photo] of chosen) if (!targets.has(photo.title)) targets.set(photo.title, photo.zone ? `zona-${slugify(photo.title)}.jpg` : `${slug}.jpg`);
  const local = new Map();
  const blurs = new Map();
  await pool([...targets], 6, async ([title, file]) => {
    const photo = [...chosen.values()].find((p) => p.title === title);
    local.set(title, await download(file, photo.src));
    blurs.set(title, await blurDataUrl(photo.src));
  });

  const result = {};
  for (const [slug, photo] of chosen) {
    const { originalWidth, originalHeight, title, context, ...rest } = photo;
    result[slug] = { ...rest, src: local.get(title), blur: blurs.get(title) };
  }

  await writeFile(OUTPUT, JSON.stringify(result, null, 1) + "\n");
  const missing = places.filter((p) => !result[p.slug]).map((p) => p.slug);
  console.log(
    `✓ fotos: ${curated} curadas + ${automatic} Commons + ${wiki} Wikipedia + ${zoned.size} de la zona = ${Object.keys(result).length}/${places.length}`,
  );
  if (missing.length) console.warn(`  · sin foto (${missing.length}): ${missing.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(async (error) => {
  console.warn(`⚠ No se pudieron resolver las fotos (${error.message}). Se mantiene el archivo existente.`);
  try {
    await readFile(OUTPUT);
  } catch {
    await writeFile(OUTPUT, "{}\n");
  }
});
