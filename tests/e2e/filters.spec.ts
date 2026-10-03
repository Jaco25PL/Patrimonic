import { expect, test } from "@playwright/test";
import { count, expectCount } from "./helpers";

test.beforeEach(async ({ page }) => page.goto("/"));

test("búsqueda tolera tildes y mayúsculas", async ({ page }) => {
  await page.getByLabel("Buscar").fill("CASAPUEBLO");
  await expect(page.getByRole("link", { name: /Museo Taller de Casapueblo/ })).toBeVisible();
  await page.getByLabel("Buscar").fill("piriapolis");
  await expectCount(page, (n) => n >= 5);
  await expect(page.getByRole("heading", { name: /^Piriápolis/ })).toBeVisible();
});

test("borrar la búsqueda vuelve a todos", async ({ page }) => {
  await page.getByLabel("Buscar").fill("faro");
  await expectCount(page, (n) => n > 0 && n < 491);
  await page.getByRole("button", { name: "Borrar búsqueda" }).click();
  await expect(count(page)).toHaveText("491 lugares");
});

test("filtro por día reduce y es coherente", async ({ page }) => {
  await page.getByRole("radio", { name: "Sábado 3" }).click();
  await expectCount(page, (n) => n > 300 && n < 491);
  const sab = Number((await count(page).textContent())!.match(/\d+/)![0]);
  await page.getByRole("radio", { name: "Domingo 4" }).click();
  await expectCount(page, (n) => n !== sab && n < 491);
  // Los que solo abren sábado llevan la etiqueta "Sáb 3" y no aparecen el domingo
  await expect(page.getByText("Sáb 3", { exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "Todo el finde" }).click();
  await expect(count(page)).toHaveText("491 lugares");
});

test("filtro por departamento", async ({ page }) => {
  await page.getByLabel("Departamento", { exact: true }).selectOption("Colonia");
  await expect(count(page)).toHaveText("28 lugares");
  const subtitles = await page.locator("section[aria-label=Lugares] h3 span:nth-child(2)").allTextContents();
  expect(new Set(subtitles.filter(Boolean))).toEqual(new Set(["Colonia"]));
});

test("filtro por categoría + vacío + reset", async ({ page }) => {
  await page.getByRole("button", { name: "Faros", exact: true }).click();
  await expectCount(page, (n) => n >= 4 && n < 20);
  await page.getByLabel("Departamento", { exact: true }).selectOption("Flores");
  await expect(page.getByText("Nada por acá")).toBeVisible();
  await page.getByRole("button", { name: "Ver todos los lugares" }).click();
  await expect(count(page)).toHaveText("491 lugares");
});

test("los filtros se mantienen al entrar a un lugar y volver", async ({ page }) => {
  await page.getByLabel("Departamento", { exact: true }).selectOption("Rocha");
  await page.getByLabel("Buscar").fill("faro");
  await page.getByRole("link", { name: /Faro de Santa María/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Faro de Santa María" })).toBeVisible();
  await page.getByRole("button", { name: "Volver" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Buscar")).toHaveValue("faro");
  await expect(page.getByLabel("Departamento", { exact: true })).toHaveValue("Rocha");
});
