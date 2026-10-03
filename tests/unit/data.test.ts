import { describe, expect, it } from "vitest";
import places from "@/data/places.json";
import sources from "../../data/photo-sources.json";
import { DEPARTMENTS } from "@/data/repository";
import { CATEGORIES } from "@/domain/categories";

type P = (typeof places)[number];
const all = places as P[];

describe("dataset (guía oficial → places.json)", () => {
  it("tiene los 491 lugares de la guía", () => {
    expect(all.length).toBe(491);
  });

  it("slugs únicos y URL-safe", () => {
    const slugs = all.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("cada lugar tiene nombre, departamento válido, localidad, días y categoría", () => {
    const depts = new Set<string>(DEPARTMENTS);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const p of all) {
      expect(p.name.trim().length, p.slug).toBeGreaterThan(2);
      expect(depts.has(p.dept), `${p.slug}: ${p.dept}`).toBe(true);
      expect(p.locality, p.slug).toBeTruthy();
      expect(p.days.length, p.slug).toBeGreaterThan(0);
      expect(cats.has(p.category as never), p.slug).toBe(true);
    }
  });

  it("los 19 departamentos están representados", () => {
    expect(new Set(all.map((p) => p.dept)).size).toBe(19);
  });

  it("casi todos tienen dirección, y ninguna dirección es una frase descriptiva", () => {
    const missing = all.filter((p) => !p.address);
    expect(missing.length).toBeLessThan(5);
    for (const p of all) {
      if (!p.address) continue;
      expect(p.address, p.slug).not.toMatch(/^(Visita|Muestra|Exposici|Charla|Se realizar)/);
      expect(p.address.length, p.slug).toBeLessThan(140);
    }
  });

  it("ningún lugar quedó sin programa", () => {
    const empty = all.filter((p) => p.program.length === 0).map((p) => p.slug);
    expect(empty).toEqual([]);
  });

  it("cada slug de photo-sources existe en el dataset", () => {
    const slugs = new Set(all.map((p) => p.slug));
    const unknown = Object.keys(sources.places).filter((s) => !slugs.has(s));
    expect(unknown).toEqual([]);
  });

  it("los candidatos de fotos tienen formato File:/Category:", () => {
    for (const list of Object.values(sources.places))
      for (const c of list as string[]) expect(c).toMatch(/^(File|Category):.+/);
  });
});
