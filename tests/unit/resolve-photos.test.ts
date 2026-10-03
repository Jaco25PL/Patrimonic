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
        extmetadata: { Artist: { value: '<a href="#">Ana Pérez</a>' }, LicenseShortName: { value: "CC BY-SA 4.0" } },
      },
    ],
  });
  let pages: unknown[] = [];
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
    const out = path.join(dir, "out.json");
    const photos = path.join(dir, "photos");
    await promisify(execFile)("node", ["scripts/resolve-photos.mjs"], {
      env: { ...process.env, COMMONS_API: `${base}/w/api.php`, PHOTOS_SOURCES: sources, PHOTOS_OUTPUT: out, PHOTOS_DIR: photos },
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

    expect((await readdir(photos)).sort()).toEqual(["lugar-categoria.jpg", "lugar-file.jpg"]);
    expect(seen.every((s) => s.endsWith("ua-ok"))).toBe(true); // Wikimedia exige User-Agent
  });
});
