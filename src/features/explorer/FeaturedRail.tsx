import Link from "next/link";
import type { PlaceSummary } from "@/domain/place";
import { getCategory } from "@/domain/categories";
import { PlacePhoto } from "@/components/PlacePhoto";

export function FeaturedRail({ places }: { places: PlaceSummary[] }) {
  if (!places.length) return null;
  return (
    <section aria-labelledby="featured-title" className="pt-2 pb-4">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <h2 id="featured-title" className="t-title-2">
          Imperdibles
        </h2>
        <p className="t-subhead mt-0.5 text-ink-2">Los íconos que abren este fin de semana.</p>
      </div>
      <div className="rail no-scrollbar mt-3 gap-3 pb-3 md:mx-auto md:max-w-5xl">
        {places.map((p, i) => (
          <Link
            key={p.slug}
            href={`/lugar/${p.slug}`}
            className="pressable hover-lift anim-rise relative block aspect-[4/5] w-[72vw] max-w-[300px] overflow-hidden rounded-[26px] bg-surface-2 shadow-[var(--shadow-card)]"
            style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
          >
            <PlacePhoto
              slug={p.slug}
              name={p.name}
              category={p.category}
              photo={p.photo}
              sizes="(min-width: 768px) 300px, 72vw"
              priority={i < 2}
            />
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="t-eyebrow text-white/75">{getCategory(p.category).singular}</p>
              <h3 className="mt-1 text-[1.3125rem] leading-[1.15] font-bold tracking-[-0.02em] text-balance">{p.name}</h3>
              <p className="t-footnote mt-1 text-white/80">
                {p.locality}
                {p.locality !== p.dept && ` · ${p.dept}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
