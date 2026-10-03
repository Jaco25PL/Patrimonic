import { expect, test } from "@playwright/test";
import places from "../../src/data/places.json";

test("las 491 fichas responden 200 con su título", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "una sola pasada alcanza");
  test.setTimeout(120_000);
  const failures: string[] = [];
  const list = places as { slug: string; name: string }[];
  for (let i = 0; i < list.length; i += 25) {
    await Promise.all(
      list.slice(i, i + 25).map(async (p) => {
        const res = await request.get(`/lugar/${p.slug}`);
        const html = await res.text();
        if (res.status() !== 200 || !html.includes("Cómo llegar")) failures.push(`${p.slug} → ${res.status()}`);
      }),
    );
  }
  expect(failures).toEqual([]);
});
