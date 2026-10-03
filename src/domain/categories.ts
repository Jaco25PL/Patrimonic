import type { CategoryId } from "./place";

export interface Category {
  id: CategoryId;
  label: string;
  /** Singular label shown as an eyebrow on detail pages. */
  singular: string;
  /** Hue (OKLCH) used by the illustrated poster fallback. */
  hue: number;
}

export const CATEGORIES: Category[] = [
  { id: "museos", label: "Museos", singular: "Museo", hue: 35 },
  { id: "palacios", label: "Palacios y casonas", singular: "Palacio y casona", hue: 70 },
  { id: "faros", label: "Faros", singular: "Faro", hue: 230 },
  { id: "iglesias", label: "Templos", singular: "Templo", hue: 300 },
  { id: "teatros", label: "Teatros", singular: "Teatro y sala", hue: 15 },
  { id: "naturaleza", label: "Parques y naturaleza", singular: "Parque y naturaleza", hue: 145 },
  { id: "bodegas", label: "Bodegas y sabores", singular: "Bodega y sabores", hue: 350 },
  { id: "recorridos", label: "Recorridos", singular: "Recorrido", hue: 190 },
  { id: "militar", label: "Fuertes y cuarteles", singular: "Fuerte y cuartel", hue: 100 },
  { id: "embajadas", label: "Embajadas", singular: "Embajada", hue: 260 },
  { id: "cultura", label: "Cultura", singular: "Espacio cultural", hue: 50 },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  return byId.get(id) ?? CATEGORIES[CATEGORIES.length - 1]!;
}
