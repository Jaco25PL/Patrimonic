import { DEPARTMENTS, getAllPlaces, getFeatured, toSummary } from "@/data/repository";
import { Explorer } from "@/features/explorer/Explorer";

export default function HomePage() {
  const places = getAllPlaces();
  const summaries = places.map(toSummary);
  const featured = getFeatured().map((p) => ({ ...toSummary(p), photo: p.photo && { src: p.photo.src, blur: p.photo.blur } }));
  const counts = new Map<string, number>();
  for (const p of places) counts.set(p.dept, (counts.get(p.dept) ?? 0) + 1);
  const departments = DEPARTMENTS.filter((d) => counts.has(d)).map((name) => ({ name, count: counts.get(name)! }));

  return <Explorer places={summaries} featured={featured} departments={departments} />;
}
