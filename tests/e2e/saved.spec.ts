import { expect, test } from "@playwright/test";
import { count } from "./helpers";

test("guardar un lugar en Mi recorrido, persiste al recargar y se puede quitar", async ({ page }) => {
  await page.goto("/lugar/palacio-salvo");
  const heart = page.getByRole("button", { name: /Agregar Palacio Salvo a mi recorrido/ });
  await heart.click();
  await expect(page.getByRole("button", { name: /Quitar Palacio Salvo/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Volver" }).click();
  await page.getByRole("button", { name: /Mi recorrido/ }).click();
  await expect(count(page)).toHaveText("1 lugar");
  await expect(page.getByRole("link", { name: /Palacio Salvo/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /Mi recorrido/ })).toContainText("1");

  await page.goto("/lugar/palacio-salvo");
  await page.getByRole("button", { name: /Quitar Palacio Salvo/ }).click();
  await page.goto("/");
  // El filtro "Mi recorrido" sigue activo (se recuerda en la sesión): ahora queda vacío.
  await expect(page.getByRole("button", { name: /Mi recorrido/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Tu recorrido está vacío")).toBeVisible();
});
