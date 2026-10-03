"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Day, PlaceSummary } from "@/domain/place";
import { featuredFor, filterPlaces, groupPlaces, isFiltering } from "@/domain/filter";
import { currentEventDay } from "@/domain/days";
import { site } from "@/config/site";
import { useSaved } from "@/hooks/useSaved";
import { SegmentedControl } from "@/components/SegmentedControl";
import { InstallButton } from "@/components/InstallButton";
import { Icon } from "@/components/Icon";
import { useCriteria } from "./criteria-store";
import { SearchField } from "./SearchField";
import { FilterChips } from "./FilterChips";
import { FeaturedRail } from "./FeaturedRail";
import { PlaceRow } from "./PlaceRow";

const DAY_OPTIONS: { value: Day | "all"; label: string }[] = [
  { value: "all", label: "Todo el finde" },
  { value: "sab", label: "Sábado 3" },
  { value: "dom", label: "Domingo 4" },
];

let autoDayApplied = false;

export function Explorer({
  places,
  departments,
  localities,
}: {
  places: PlaceSummary[];
  departments: { name: string; count: number }[];
  localities: { name: string; dept: string; count: number }[];
}) {
  const { criteria, update, reset } = useCriteria();
  const { saved, count: savedCount } = useSaved();
  const deferredQuery = useDeferredValue(criteria.query);
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const listTop = useRef<HTMLDivElement>(null);

  // During the event, open on today's program.
  useEffect(() => {
    if (autoDayApplied) return;
    autoDayApplied = true;
    const today = currentEventDay();
    if (today && criteria.day === "all") update({ day: today });
  }, [criteria.day, update]);

  // Swap the toolbar to its translucent material once content scrolls under it.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const filtering = isFiltering(criteria);
  const results = useMemo(
    () => filterPlaces(places, { ...criteria, query: deferredQuery }, saved),
    [places, criteria, deferredQuery, saved],
  );
  const groups = useMemo(() => groupPlaces(results), [results]);
  const featured = useMemo(() => featuredFor(places, criteria), [places, criteria]);
  const scope = criteria.locality !== "all" ? criteria.locality : criteria.dept !== "all" ? criteria.dept : null;

  // Keep the first result in view when filters change while scrolled down.
  const scrollToList = () => {
    const el = listTop.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: "start" });
  };
  const change = (patch: Parameters<typeof update>[0]) => {
    update(patch);
    requestAnimationFrame(scrollToList);
  };

  return (
    <main className="min-h-dvh pb-16">
      {/* Large title — scrolls away like an iOS navigation bar. */}
      <header className="safe-top mx-auto max-w-5xl px-4 md:px-8">
        <div className="flex h-12 items-center justify-between pt-1">
          <span className="flex items-center gap-2 font-rounded text-[1.0625rem] font-semibold tracking-[-0.01em]">
            <LogoMark />
            {site.name}
          </span>
          <InstallButton />
        </div>
        <p className="t-eyebrow mt-3 text-accent">3 y 4 de octubre · Uruguay</p>
        <h1 className="t-large-title mt-1.5 text-balance">Día del Patrimonio</h1>
        <p className="t-subhead mt-2 max-w-[34ch] text-ink-2">
          {places.length} lugares abren sus puertas. Este año: <span className="italic">{site.theme.split(":")[0]}</span>.
        </p>
      </header>

      <div ref={sentinel} aria-hidden="true" className="h-3" />

      {/* Floating toolbar: content scrolls underneath a translucent material. */}
      <div
        className={`sticky top-0 z-30 transition-[background-color,box-shadow] duration-300 ${stuck ? "material shadow-[0_0.5px_0_var(--separator)]" : ""}`}
      >
        <div className={`mx-auto max-w-5xl px-4 pb-3 md:px-8 ${stuck ? "safe-top" : ""}`}>
          <div className="pt-1">
            <SearchField value={criteria.query} onChange={(query) => change({ query })} />
          </div>
          <div className="mt-2.5">
            <SegmentedControl label="Día" options={DAY_OPTIONS} value={criteria.day} onChange={(day) => change({ day })} />
          </div>
        </div>
        <div className="mx-auto max-w-5xl pb-3 md:px-4">
          <FilterChips
            criteria={criteria}
            update={change}
            departments={departments}
            localities={localities}
            savedCount={savedCount}
          />
        </div>
      </div>

      <FeaturedRail places={featured} scope={scope} />

      <div ref={listTop} className="scroll-mt-[190px]" />
      <section aria-label="Lugares" className="mx-auto max-w-5xl px-4 md:px-8">
        <div className="flex items-baseline justify-between pt-3 pb-1">
          <h2 className="t-title-2">{filtering ? "Resultados" : "Todos los lugares"}</h2>
          <p className="t-footnote text-ink-2 tabular-nums" aria-live="polite">
            {results.length} {results.length === 1 ? "lugar" : "lugares"}
          </p>
        </div>

        {results.length === 0 ? (
          <EmptyState onlySaved={criteria.onlySaved} onReset={reset} />
        ) : (
          <div className="md:columns-2 md:gap-10">
            {groups.map((g) => (
              <div key={g.key} className="break-inside-avoid pt-5">
                <h3 className="flex items-baseline gap-2 border-b border-separator pb-2">
                  <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{g.title}</span>
                  {g.subtitle && <span className="t-footnote text-ink-3">{g.subtitle}</span>}
                </h3>
                <ul className="pt-1">
                  {g.items.map((p) => (
                    <PlaceRow key={p.slug} place={p} saved={saved.has(p.slug)} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="t-footnote mx-auto mt-16 max-w-5xl px-4 text-ink-3 md:px-8">
        <p>
          Información de la{" "}
          <a href={site.sourceUrl} className="underline decoration-separator underline-offset-2" target="_blank" rel="noreferrer">
            {site.source}
          </a>
          . Horarios sujetos a cambios: confirmá con cada institución.
        </p>
        <p className="mt-2">Fotos: Wikimedia Commons, con sus respectivas licencias (crédito en cada lugar).</p>
      </footer>
    </main>
  );
}

function EmptyState({ onlySaved, onReset }: { onlySaved: boolean; onReset: () => void }) {
  return (
    <div className="anim-fade flex flex-col items-center px-6 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-fill text-ink-2">
        <Icon name={onlySaved ? "heart" : "search"} size={26} />
      </div>
      <p className="t-headline mt-4">{onlySaved ? "Tu recorrido está vacío" : "Nada por acá"}</p>
      <p className="t-subhead mt-1 max-w-[30ch] text-ink-2">
        {onlySaved
          ? "Tocá el corazón en cualquier lugar para sumarlo a tu recorrido."
          : "Probá con otro nombre, barrio o ciudad, o sacá algún filtro."}
      </p>
      <button type="button" onClick={onReset} className="pressable mt-5 h-10 rounded-full bg-fill px-5 text-[0.9375rem] font-semibold text-accent">
        Ver todos los lugares
      </button>
    </div>
  );
}

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <g fill="none" stroke="var(--on-accent)" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="16" cy="16" r="3.2" />
        <path d="M16 6.5v3.2M16 22.3v3.2M6.5 16h3.2M22.3 16h3.2M9.3 9.3l2.2 2.2M20.5 20.5l2.2 2.2M22.7 9.3l-2.2 2.2M11.5 20.5l-2.2 2.2" />
      </g>
    </svg>
  );
}
