import { expect, test } from "@playwright/test";

test("manifest instalable con íconos válidos", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ short_name: "Huella", display: "standalone", start_url: "/?source=pwa" });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
  for (const icon of [...manifest.icons, { src: "/apple-icon" }, { src: "/icon" }]) {
    const res = await request.get(icon.src);
    expect(res.status(), icon.src).toBe(200);
    expect(res.headers()["content-type"], icon.src).toContain("image/png");
  }
});

test("meta tags de app nativa (viewport-fit, theme-color, apple)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name=viewport]')).toHaveAttribute("content", /viewport-fit=cover/);
  await expect(page.locator('meta[name=viewport]')).not.toHaveAttribute("content", /user-scalable=no|maximum-scale/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
  await expect(page.locator('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]').first()).toHaveAttribute("content", "yes");
});

test("funciona offline después de la primera visita (service worker)", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium");
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ahora controlado por el SW
  await page.goto("/lugar/faro-de-colonia");
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Día del Patrimonio");
  await page.goto("/lugar/faro-de-colonia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Faro de Colonia");
  await context.setOffline(false);
});
