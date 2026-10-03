import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

// A tiny valid JPEG (1×1) used as every "photo".
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

let server: Server;
let base = "";
const seen: string[] = [];

/** Fake Commons API. Thumbnails live on a different path/"host", like thumb.wikimedia.org does now. */
function handler(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  const url = new URL(req.url!, base);
  seen.push(url.pathname + (req.headers["user-agent"]?.startsWith("HuellaPatrimonio") ? " ua-ok" : " ua-missing"));
  if (url.pathname.startsWith("/thumb/")) {
    if (url.pathname.includes("broken")) return res.writeHead(404).end();
    return res.writeHead(200, { "content-type": "image/jpeg" }).end(JPEG);
  }
  const info = (name: string, w: number, h: number) => ({
    title: `File:${name}`,
    imageinfo: [
      {
        mime: "image/jpeg",
        width: w,
        height: h,
        url: `${base}/orig/${name}`,
        thumburl: `${base}/thumb/1280px-${name}`,
        thumbwidth: 1280,
        thumbheight: Math.round((1280 * h) / w),
        descriptionurl: `https://commons.wikimedia.org/wiki/File:${name}`,
        extmetadata: {
          Artist: { value: '<a href="#">Ana Pérez</a>' },
          LicenseShortName: { value: "CC BY-SA 4.0" },
          Categories: { value: name.includes("Rosario") ? "Rosario (Argentina)" : "Buildings in Montevideo|Uruguay" },
        },
      },
    ],
  });
  let pages: unknown[] = [];
  const search = url.searchParams.get("gsrsearch") ?? "";
  if (search.startsWith("Teatro Victoria")) pages = [info("Teatro Victoria (Montevideo) fachada.jpg", 3000, 2000), info("Teatro Colón.jpg", 3000, 2000)];
  if (search.startsWith("Museo de la Memoria")) pages = [info("Museo de la Memoria Rosario Argentina.jpg", 3000, 2000)];
  // Like CirrusSearch: every word must match, so "Facultad de Química Aguada" finds nothing
  if (search === "Facultad de Química") pages = [info("Facultad de Química, Universidad de la República (Montevideo).jpg", 3000, 2000)];
  if (search.startsWith("Taller de Arte")) pages = [info("Taller de arte.jpg", 3000, 2000)];
  if (url.searchParams.get("titles")) pages = [info("Good.jpg", 4000, 3000), info("broken.jpg", 4000, 3000)];
  if (url.searchParams.get("gcmtitle") === "Category:Mix")
    pages = [info("Plano_interior.jpg", 4000, 3000), info("Fachada.jpg", 3000, 2000), info("Vertical.jpg", 2000, 4000)];
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ query: { pages } }));
}

beforeAll(async () => {
  server = createServer(handler);
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://localhost:${(server.address() as { port: number }).port}`;
});
afterAll(() => server.close());

describe("resolve-photos (build)", () => {
  it("resuelve, descarga a /photos y genera crédito; tolera fallas", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "photos-"));
    const sources = path.join(dir, "sources.json");
    await writeFile(
      sources,
      JSON.stringify({
        places: {
          "lugar-file": ["File:Good.jpg"],
          "lugar-categoria": ["File:Missing.jpg", "Category:Mix"],
          "lugar-roto": ["File:broken.jpg"],
          "lugar-nada": ["File:Missing.jpg"],
        },
      }),
    );
    const placesFile = path.join(dir, "places.json");
    const P = (slug: string, name: string) => ({ slug, name, locality: "Centro", dept: "Montevideo" });
    await writeFile(
      placesFile,
      JSON.stringify([
        P("lugar-file", "Lugar"),
        P("teatro-victoria", "Teatro Victoria"),
        P("museo-de-la-memoria", "Museo de la Memoria"),
        P("taller-de-arte", "Taller de Arte"),
        { slug: "facultad-de-quimica-udelar", name: "Facultad de Química – Udelar", locality: "Aguada", dept: "Montevideo" },
      ]),
    );
    const out = path.join(dir, "out.json");
    const photos = path.join(dir, "photos");
    await promisify(execFile)("node", ["scripts/resolve-photos.mjs"], {
      env: { ...process.env, COMMONS_API: `${base}/w/api.php`, PHOTOS_SOURCES: sources, PHOTOS_PLACES: placesFile, PHOTOS_OUTPUT: out, PHOTOS_DIR: photos },
    });
    const result = JSON.parse(await readFile(out, "utf8"));

    // Archivo directo: se sirve desde nuestro dominio, con autor sin HTML y licencia
    expect(result["lugar-file"]).toMatchObject({ src: "/photos/lugar-file.jpg", author: "Ana Pérez", license: "CC BY-SA 4.0" });
    // Categoría: elige la foto horizontal tipo "fachada", evita planos/interiores y verticales
    expect(result["lugar-categoria"].page).toContain("Fachada.jpg");
    expect(result["lugar-categoria"].src).toBe("/photos/lugar-categoria.jpg");
    // Descarga fallida: queda la URL remota como respaldo (permitida en next.config)
    expect(result["lugar-roto"].src).toMatch(/\/thumb\/1280px-broken\.jpg$/);
    // Sin candidatos válidos: sin foto (la app muestra el póster)
    expect(result["lugar-nada"]).toBeUndefined();

    // Búsqueda automática: acepta la foto correcta y la marca como automática…
    expect(result["teatro-victoria"]).toMatchObject({ src: "/photos/teatro-victoria.jpg", auto: true });
    expect(result["teatro-victoria"].page).toContain("Teatro Victoria (Montevideo)");
    // …y rechaza homónimos de otro país y nombres genéricos
    expect(result["museo-de-la-memoria"]).toBeUndefined();
    expect(result["taller-de-arte"]).toBeUndefined();
    expect(result["lugar-file"].auto).toBeUndefined();
    // Busca primero con el nombre limpio (sin "– Udelar" ni el barrio)
    expect(result["facultad-de-quimica-udelar"]).toMatchObject({ auto: true });

    expect((await readdir(photos)).sort()).toEqual(["facultad-de-quimica-udelar.jpg", "lugar-categoria.jpg", "lugar-file.jpg", "teatro-victoria.jpg"]);
    expect(seen.every((s) => s.endsWith("ua-ok"))).toBe(true); // Wikimedia exige User-Agent
  });
});

describe("reglas de la búsqueda automática", async () => {
  // @ts-expect-error — plain ESM build script
  const { acceptsAuto, distinctiveTokens, searchName, searchQueries } = await import("../../scripts/resolve-photos.mjs");
  const place = (name: string, locality = "Centro", dept = "Montevideo") => ({ name, locality, dept });
  const photo = (title: string, context = "Uruguay") => ({ title: `File:${title}`, context: `${title} ${context}` });

  it("tokens distintivos ignoran palabras genéricas", () => {
    expect(distinctiveTokens("Museo Histórico de la Casa de Gobierno")).toEqual(["gobierno"]);
    expect(distinctiveTokens("Taller de Arte")).toEqual([]);
  });
  it.each([
    ["Palacio Salvo", "Palacio Salvo 1.JPG", true],
    ["Faro de José Ignacio", "Faro de Jose Ignacio Maldonado.jpg", true],
    ["Teatro Victoria", "Plaza Victoria.jpg", false], // tipo distinto
    ["Castillo Soneira", "Soneira family.jpg", false], // falta el tipo
    ["Museo Andes 1972", "Museo Andes 1972 interior.jpg", false], // interiores evitados
    ["Embajada de Panamá en Uruguay", "Canal de Panamá.jpg", false], // le falta "embajada"? cubierto por contexto
  ])("%s ← %s → %s", (name, title, ok) => {
    const context = name.includes("Panamá") ? "Panama City" : "Montevideo Uruguay";
    expect(acceptsAuto(place(name), photo(title, context))).toBe(ok);
  });
  it("limpia el nombre para buscar", () => {
    expect(searchName("Facultad de Química – Udelar")).toBe("Facultad de Química");
    expect(searchName("Museo Militar “Fortaleza General Artigas”")).toBe("Museo Militar");
    expect(searchName("Palacio de la Luz (UTE)")).toBe("Palacio de la Luz");
    expect(searchQueries({ name: "Teatro Victoria", locality: "Centro", dept: "Montevideo" })).toEqual([
      "Teatro Victoria",
      "Teatro Victoria Montevideo",
      "Teatro Victoria Centro",
    ]);
  });
  it("también busca por el nombre entre comillas", () => {
    expect(searchQueries({ name: "Museo Militar “Fortaleza General Artigas”", locality: "Cerro", dept: "Montevideo" })[1]).toBe(
      "Fortaleza General Artigas",
    );
  });
  it("exige que la foto sea de Uruguay", () => {
    expect(acceptsAuto(place("Museo de la Memoria"), photo("Museo de la Memoria.jpg", "Santiago de Chile"))).toBe(false);
    expect(acceptsAuto(place("Museo de la Memoria"), photo("Museo de la Memoria.jpg", "Montevideo"))).toBe(true);
  });
});
