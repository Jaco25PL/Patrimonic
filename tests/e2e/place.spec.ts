import { expect, test } from "@playwright/test";
import { trackErrors } from "./helpers";

test("ficha completa: título, programa, datos y Cómo llegar", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/lugar/faro-de-colonia");
  await expect(page).toHaveTitle("Faro de Colonia · Huella");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Faro de Colonia");
  await expect(page.getByText("Faro · Colonia")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Programa" })).toBeVisible();
  await expect(page.getByText("De 10 a 18 h")).toBeVisible();
  await expect(page.getByText("Armada Nacional")).toBeVisible();

  const cta = page.getByRole("link", { name: /Cómo llegar a Faro de Colonia/ });
  await expect(cta).toBeInViewport();
  await expect(cta).toHaveAttribute("target", "_blank");
  const url = new URL((await cta.getAttribute("href"))!);
  expect(url.hostname).toBe("www.google.com");
  expect(url.pathname).toBe("/maps/dir/");
  expect(url.searchParams.get("destination")).toBe("Faro de Colonia, Barrio Histórico de Colonia del Sacramento, Colonia, Uruguay");
  expect(errors).toEqual([]);
});

test("Cómo llegar abre Google Maps en una pestaña nueva", async ({ page, context }) => {
  await context.route("https://www.google.com/**", (r) => r.fulfill({ status: 200, body: "maps" }));
  await page.goto("/lugar/palacio-salvo");
  const [maps] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: /Cómo llegar/ }).click()]);
  expect(maps.url()).toContain("google.com/maps/dir/?api=1&destination=Palacio+Salvo");
});

test("foto que carga bien + crédito con licencia", async ({ page }) => {
  await page.goto("/lugar/palacio-salvo");
  const img = page.getByRole("img", { name: "Palacio Salvo" }).first();
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await expect(page.getByText("Foto:")).toContainText("Autor de prueba");
  await expect(page.getByRole("link", { name: "CC BY-SA 4.0" })).toBeVisible();
});

test("foto rota cae al póster ilustrado (sin hueco ni ícono roto)", async ({ page }) => {
  await page.goto("/lugar/castillo-de-piria");
  const hero = page.locator("main > div").first();
  await expect(hero.locator("svg[aria-hidden=true]").first()).toBeVisible({ timeout: 15_000 });
  await expect(hero.locator("img")).toHaveCount(0);
});

test("lugar sin foto muestra póster y no muestra crédito", async ({ page }) => {
  await page.goto("/lugar/antel");
  await expect(page.locator("main > div").first().locator("svg").first()).toBeVisible();
  await expect(page.getByText("Foto:")).toHaveCount(0);
});

test("entrar directo por link y tocar Volver lleva a la home", async ({ page }) => {
  await page.goto("/lugar/argentino-hotel");
  await page.getByRole("button", { name: "Volver" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Día del Patrimonio");
});

test("lugares cercanos navegan a otra ficha", async ({ page }) => {
  await page.goto("/lugar/faro-de-colonia");
  const related = page.locator("section[aria-labelledby=related-title] a").first();
  const name = (await related.locator("p").first().textContent())!;
  await related.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("compartir sin Web Share copia el link y avisa", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/lugar/palacio-salvo");
  await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
  await page.getByRole("button", { name: "Compartir" }).click();
  await expect(page.getByRole("status")).toHaveText("Enlace copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("/lugar/palacio-salvo");
});

test("slug inexistente da 404 amigable", async ({ page }) => {
  const res = await page.goto("/lugar/no-existe");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("Esta puerta está cerrada")).toBeVisible();
});

test("metadatos para compartir (OG)", async ({ page }) => {
  await page.goto("/lugar/palacio-salvo");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", "Palacio Salvo");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /icons\/512/);
});
