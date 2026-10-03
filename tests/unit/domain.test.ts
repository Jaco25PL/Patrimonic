import { describe, expect, it } from "vitest";
import { normalize } from "@/domain/text";
import { EMPTY_CRITERIA, filterPlaces, groupPlaces, isFiltering } from "@/domain/filter";
import { directionsUrl, mapsQuery } from "@/domain/maps";
import { currentEventDay, describeDays } from "@/domain/days";
import { parseProgram } from "@/domain/program";
import type { PlaceSummary } from "@/domain/place";

const mk = (o: Partial<PlaceSummary>): PlaceSummary => ({
  slug: "x",
  name: "X",
  activity: null,
  dept: "Montevideo",
  locality: "Centro",
  address: null,
  days: ["sab", "dom"],
  category: "museos",
  photo: null,
  search: "",
  ...o,
});
const a = mk({ slug: "a", name: "Castillo de Piria", dept: "Canelones", locality: "Progreso", days: ["sab"], category: "palacios", search: normalize("Castillo de Piria Progreso Canelones") });
const b = mk({ slug: "b", name: "Museo José", days: ["dom"], search: normalize("Museo José Centro Montevideo") });
const c = mk({ slug: "c", name: "Faro", dept: "Colonia", locality: "Colonia del Sacramento", category: "faros", search: normalize("Faro Colonia") });
const list = [a, b, c];

describe("normalize", () => {
  it("quita tildes, mayúsculas y espacios extra", () => {
    expect(normalize("  José   ÁLVAREZ  ")).toBe("jose alvarez");
  });
});

describe("filterPlaces", () => {
  const none = new Set<string>();
  it("sin criterios devuelve todo", () => expect(filterPlaces(list, EMPTY_CRITERIA, none)).toBe(list));
  it("búsqueda sin tildes y multi-palabra", () => {
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, query: "jose" }, none).map((p) => p.slug)).toEqual(["b"]);
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, query: "PIRIA progreso" }, none).map((p) => p.slug)).toEqual(["a"]);
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, query: "zzz" }, none)).toEqual([]);
  });
  it("por día incluye los que abren ambos días", () => {
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, day: "sab" }, none).map((p) => p.slug)).toEqual(["a", "c"]);
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, day: "dom" }, none).map((p) => p.slug)).toEqual(["b", "c"]);
  });
  it("por departamento y categoría", () => {
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, dept: "Colonia" }, none).map((p) => p.slug)).toEqual(["c"]);
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, category: "palacios" }, none).map((p) => p.slug)).toEqual(["a"]);
  });
  it("solo guardados", () => {
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, onlySaved: true }, new Set(["c"])).map((p) => p.slug)).toEqual(["c"]);
  });
  it("criterios combinados (AND)", () => {
    expect(filterPlaces(list, { ...EMPTY_CRITERIA, day: "dom", dept: "Canelones" }, none)).toEqual([]);
  });
  it("isFiltering ignora el día", () => {
    expect(isFiltering({ ...EMPTY_CRITERIA, day: "sab" })).toBe(false);
    expect(isFiltering({ ...EMPTY_CRITERIA, query: " a" })).toBe(true);
  });
});

describe("groupPlaces", () => {
  it("agrupa por departamento/localidad preservando el orden", () => {
    const g = groupPlaces([b, mk({ slug: "d" }), c]);
    expect(g.map((x) => x.key)).toEqual(["Montevideo/Centro", "Colonia/Colonia del Sacramento"]);
    expect(g[0]!.items.map((p) => p.slug)).toEqual(["b", "d"]);
  });
});

describe("maps", () => {
  const place = { name: "Faro de Colonia", address: "Barrio Histórico", locality: "Colonia", dept: "Colonia" };
  it("arma la query sin duplicados", () => {
    expect(mapsQuery(place)).toBe("Faro de Colonia, Barrio Histórico, Colonia, Uruguay");
  });
  it("usa el link universal de direcciones de Google Maps, codificado", () => {
    const url = new URL(directionsUrl({ ...place, address: "Calle 1 & 2 #3" }));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toContain("Calle 1 & 2 #3");
  });
  it("tolera dirección nula", () => {
    expect(mapsQuery({ ...place, address: null })).toBe("Faro de Colonia, Colonia, Uruguay");
  });
});

describe("días", () => {
  it("detecta el día del evento en hora de Montevideo (UTC-3)", () => {
    expect(currentEventDay(new Date("2026-10-03T12:00:00-03:00"))).toBe("sab");
    expect(currentEventDay(new Date("2026-10-04T23:30:00-03:00"))).toBe("dom");
    expect(currentEventDay(new Date("2026-10-05T01:00:00Z"))).toBe("dom"); // aún domingo en UY
    expect(currentEventDay(new Date("2026-10-05T12:00:00-03:00"))).toBeNull();
  });
  it("describe los días", () => {
    expect(describeDays(["sab", "dom"])).toBe("Sábado y domingo");
    expect(describeDays(["dom"])).toBe("Solo domingo");
  });
});

describe("parseProgram", () => {
  it("separa días, horarios y texto", () => {
    const blocks = parseProgram([
      "Sábado 3 y domingo 4",
      "De 10 a 18 h. Visita guiada.",
      "Domingo 4",
      "18 h. Charla final.",
      "18 h. Charla final.",
      "Sin horario.",
    ]);
    expect(blocks).toEqual([
      { day: "Sábado 3 y domingo 4", items: [{ time: "De 10 a 18 h", text: "Visita guiada." }] },
      { day: "Domingo 4", items: [{ time: "18 h", text: "Charla final." }, { time: null, text: "Sin horario." }] },
    ]);
  });
  it("texto en la misma línea del día", () => {
    expect(parseProgram(["Sábado 3 El edificio abre."])[0]).toEqual({ day: "Sábado 3", items: [{ time: null, text: "El edificio abre." }] });
  });
  it("no confunde calles 'Domingo Cullen' con un día", () => {
    expect(parseProgram(["Domingo Cullen 895"])[0]!.day).toBeNull();
  });
});
