import { expect, test } from "@playwright/test";
import { count, expectCount, trackErrors } from "./helpers";

test("la home carga los 491 lugares sin errores", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page).toHaveTitle(/Huella/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Día del Patrimonio");
  await expect(count(page)).toHaveText("491 lugares");
  await expect(page.locator('a[href^="/lugar/"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Imperdibles muestra solo lugares con foto, en orden curado", async ({ page }) => {
  await page.goto("/");
  const rail = page.locator("section[aria-labelledby=featured-title]");
  await expect(rail.getByRole("heading", { name: "Imperdibles" })).toBeVisible();
  const names = await rail.locator("h3").allTextContents();
  expect(names).toEqual(["Palacio Salvo", "Museo Taller de Casapueblo", "Castillo de Piria"]);
});

test("no hay scroll horizontal en pantallas chicas (320px)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.goto("/lugar/palacio-salvo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("la barra de búsqueda queda fija al scrollear", async ({ page }) => {
  await page.goto("/");
  await page.mouse.wheel(0, 2500);
  await expect(page.getByLabel("Buscar")).toBeInViewport();
  await expectCount(page, (n) => n === 491);
});

test("todos los botones tienen nombre accesible y las imágenes alt", async ({ page }) => {
  for (const url of ["/", "/lugar/palacio-salvo"]) {
    await page.goto(url);
    const unnamed = await page.$$eval("button, a", (els) =>
      els.filter((e) => !(e.getAttribute("aria-label") || e.textContent?.trim())).map((e) => e.outerHTML.slice(0, 80)),
    );
    expect(unnamed, url).toEqual([]);
    expect(await page.locator("img:not([alt])").count(), url).toBe(0);
  }
});
