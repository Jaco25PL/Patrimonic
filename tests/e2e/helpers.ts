import { expect, type Page } from "@playwright/test";

export const count = (page: Page) => page.locator("p[aria-live=polite]");

export async function expectCount(page: Page, predicate: (n: number) => boolean) {
  await expect
    .poll(async () => predicate(Number((await count(page).textContent())?.match(/\d+/)?.[0] ?? -1)))
    .toBe(true);
}

/** Fails the test on any uncaught error or console.error (ignoring the expected broken-image fixture). */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|Does_not_exist|_next\/image/.test(m.text())) errors.push(m.text());
  });
  return errors;
}
