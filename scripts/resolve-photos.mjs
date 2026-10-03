// Resolves data/photo-sources.json against the Wikimedia Commons API and writes
// src/data/photos.generated.json with optimized thumbnail URLs, dimensions,
// a tiny blur placeholder and attribution (author + license) for every place.
//
// Runs automatically before `next build`. It never fails the build: if Commons
// is unreachable, the previously generated file is kept and places without a
// photo fall back to the illustrated poster.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = path.join(ROOT, "data/photo-sources.json");
const OUTPUT = path.join(ROOT, "src/data/photos.generated.json");

const API = "https://commons.wikimedia.org/w/api.php";
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
  iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
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
  };
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
  const { places } = JSON.parse(await readFile(SOURCES, "utf8"));
  const entries = Object.entries(places);

  const fileTitles = [...new Set(entries.flatMap(([, list]) => list.filter((s) => s.startsWith("File:"))))];
  const files = await resolveFiles(fileTitles);

  const result = {};
  for (const [slug, candidates] of entries) {
    let photo = null;
    for (const candidate of candidates) {
      photo = candidate.startsWith("Category:") ? await resolveCategory(candidate).catch(() => null) : files.get(candidate);
      if (photo) break;
    }
    if (!photo) {
      console.warn(`  · sin foto: ${slug}`);
      continue;
    }
    const { originalWidth, originalHeight, title, ...rest } = photo;
    result[slug] = { ...rest, blur: await blurDataUrl(photo.src) };
  }

  await writeFile(OUTPUT, JSON.stringify(result, null, 1) + "\n");
  console.log(`✓ fotos: ${Object.keys(result).length}/${entries.length} lugares con foto`);
}

main().catch(async (error) => {
  console.warn(`⚠ No se pudieron resolver las fotos (${error.message}). Se mantiene el archivo existente.`);
  try {
    await readFile(OUTPUT);
  } catch {
    await writeFile(OUTPUT, "{}\n");
  }
});
