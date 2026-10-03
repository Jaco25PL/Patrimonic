import type { CategoryId, Day, PlaceSummary } from "./place";
import { normalize } from "./text";

export interface Criteria {
  query: string;
  day: Day | "all";
  dept: string | "all";
  locality: string | "all";
  category: CategoryId | "all";
  onlySaved: boolean;
}

export const EMPTY_CRITERIA: Criteria = { query: "", day: "all", dept: "all", locality: "all", category: "all", onlySaved: false };

export function isFiltering(c: Criteria): boolean {
  return c.query.trim() !== "" || c.dept !== "all" || c.locality !== "all" || c.category !== "all" || c.onlySaved;
}

/** Each criterion is an independent predicate; a place must satisfy all of them. */
export function filterPlaces(places: PlaceSummary[], c: Criteria, saved: ReadonlySet<string>): PlaceSummary[] {
  const terms = normalize(c.query).split(" ").filter(Boolean);
  const predicates: Array<(p: PlaceSummary) => boolean> = [];
  if (c.day !== "all") predicates.push((p) => p.days.includes(c.day as Day));
  if (c.dept !== "all") predicates.push((p) => p.dept === c.dept);
  if (c.locality !== "all") predicates.push((p) => p.locality === c.locality);
  if (c.category !== "all") predicates.push((p) => p.category === c.category);
  if (c.onlySaved) predicates.push((p) => saved.has(p.slug));
  if (terms.length) predicates.push((p) => terms.every((t) => p.search.includes(t)));
  return predicates.length ? places.filter((p) => predicates.every((test) => test(p))) : places;
}

/**
 * The "Imperdibles" rail for the current place filters (day, department, locality, category):
 * hand-picked icons first, then other places with a photo. Hidden while searching or in "Mi recorrido".
 */
export function featuredFor(places: PlaceSummary[], c: Criteria, limit = 12): PlaceSummary[] {
  if (c.query.trim() !== "" || c.onlySaved) return [];
  const scoped = filterPlaces(places, { ...c, query: "", onlySaved: false }, new Set()).filter((p) => p.photo);
  const unfiltered = c.dept === "all" && c.locality === "all" && c.category === "all";
  return scoped
    .filter((p) => !unfiltered || p.rank !== null)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .slice(0, limit);
}

export interface Group {
  key: string;
  title: string;
  subtitle: string;
  items: PlaceSummary[];
}

/** Groups by department, then locality — the way the printed guide is organized. */
export function groupPlaces(places: PlaceSummary[]): Group[] {
  const groups = new Map<string, Group>();
  for (const p of places) {
    const key = `${p.dept}/${p.locality}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, title: p.locality, subtitle: p.locality === p.dept ? "" : p.dept, items: [] };
      groups.set(key, g);
    }
    g.items.push(p);
  }
  return [...groups.values()];
}
