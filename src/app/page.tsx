import { DEPARTMENTS, getAllPlaces, getLocalities, toSummary } from "@/data/repository";
import { Explorer } from "@/features/explorer/Explorer";

/** Blur placeholders only for the first cards of the default rail (keeps the payload small). */
const BLUR_FOR_TOP = 4;

export default function HomePage() {
  const places = getAllPlaces();
  const summaries = places.map((p) => toSummary(p));
  for (const s of summaries) {
    if (s.rank !== null && s.rank < BLUR_FOR_TOP) {
      const full = places.find((p) => p.slug === s.slug)!;
      s.photo = toSummary(full, true).photo;
    }
  }
  const counts = new Map<string, number>();
  for (const p of places) counts.set(p.dept, (counts.get(p.dept) ?? 0) + 1);
  const departments = DEPARTMENTS.filter((d) => counts.has(d)).map((name) => ({ name, count: counts.get(name)! }));

  return <Explorer places={summaries} departments={departments} localities={getLocalities()} />;
}
