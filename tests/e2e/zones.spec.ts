import { expect, test } from "@playwright/test";
import { count } from "./helpers";

const rail = (page: import("@playwright/test").Page) => page.locator("section[aria-labelledby=featured-title]");

test.beforeEach(async ({ page }) => page.goto("/"));

test("los imperdibles se mantienen al elegir departamento, filtrados por zona", async ({ page }) => {
  await page.getByLabel("Departamento", { exact: true }).selectOption("Montevideo");
  await expect(rail(page).getByRole("heading", { name: "Imperdibles en Montevideo" })).toBeVisible();
  // curados primero, después los que tienen foto automática
  await expect(rail(page).locator("h3")).toHaveText(["Palacio Salvo", "Teatro Victoria"]);

  await page.getByLabel("Departamento", { exact: true }).selectOption("Canelones");
  await expect(rail(page).locator("h3")).toHaveText(["Castillo de Piria"]);

  // sin lugares con foto en la zona → no se muestra un carrusel vacío
  await page.getByLabel("Departamento", { exact: true }).selectOption("Flores");
  await expect(rail(page)).toHaveCount(0);
});

test("filtro de localidad (ej. Ciudad Vieja) y su relación con el departamento", async ({ page }) => {
  const dept = page.getByLabel("Departamento", { exact: true });
  const loc = page.getByLabel("Localidad");
  await expect(page.getByText("Departamento", { exact: true })).toBeVisible();

  const label = (await loc.locator('option[value="Montevideo/Ciudad Vieja"]').textContent())!;
  const expected = label.match(/\((\d+)\)/)![1];
  await loc.selectOption("Montevideo/Ciudad Vieja");
  await expect(count(page)).toHaveText(`${expected} lugares`);
  await expect(dept).toHaveValue("Montevideo"); // elegir la localidad fija su departamento
  await expect(page.locator("section[aria-label=Lugares] h3 > span:first-child")).toHaveText(["Ciudad Vieja"]);

  // cambiar de departamento limpia la localidad y acota sus opciones
  await dept.selectOption("Colonia");
  await expect(loc).toHaveValue("all");
  const options = await loc.locator("option").allTextContents();
  expect(options[0]).toBe("Todo Colonia");
  expect(options.some((o) => o.startsWith("Carmelo"))).toBe(true);
  expect(options.some((o) => o.startsWith("Ciudad Vieja"))).toBe(false);
});

test("las tarjetas de la lista muestran la foto cuando el lugar tiene una", async ({ page }) => {
  await page.getByLabel("Buscar").fill("teatro victoria");
  const row = page.locator("section[aria-label=Lugares] li").first();
  const img = row.getByRole("img", { name: "Teatro Victoria" });
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
});
