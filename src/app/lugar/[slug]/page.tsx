import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPlaces, getPlace, getRelated, toSummary } from "@/data/repository";
import { getCategory } from "@/domain/categories";
import { describeDays } from "@/domain/days";
import { directionsUrl } from "@/domain/maps";
import { parseProgram } from "@/domain/program";
import { site } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { PlacePhoto } from "@/components/PlacePhoto";
import { BackButton, SaveButton, ShareButton } from "@/features/place/PlaceActions";
import { DirectionsBar } from "@/features/place/DirectionsBar";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllPlaces().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const place = getPlace((await params).slug);
  if (!place) return {};
  const description = [place.activities[0], `${place.locality}, ${place.dept}`, describeDays(place.days)]
    .filter(Boolean)
    .join(" · ");
  return {
    title: place.name,
    description,
    alternates: { canonical: `/lugar/${place.slug}` },
    openGraph: {
      title: place.name,
      description,
      type: "article",
      images: place.photo ? [{ url: place.photo.src, width: place.photo.width, height: place.photo.height }] : undefined,
    },
  };
}

export default async function PlacePage({ params }: { params: Promise<Params> }) {
  const place = getPlace((await params).slug);
  if (!place) notFound();

  const category = getCategory(place.category);
  const program = parseProgram(place.program);
  const related = getRelated(place).map((p) => toSummary(p));
  const directions = directionsUrl(place);
  const where = place.locality === place.dept ? place.dept : `${place.locality}, ${place.dept}`;

  return (
    <main className="min-h-dvh pb-32">
      {/* Hero */}
      <div className="relative h-[clamp(340px,60svh,600px)] overflow-hidden bg-surface-2">
        <div className="anim-settle absolute inset-0">
          <PlacePhoto
            slug={place.slug}
            name={place.name}
            category={place.category}
            photo={place.photo}
            sizes="100vw"
            priority
          />
        </div>
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent" />
        {place.photo?.zone && (
          <p className="material-dark absolute right-4 bottom-11 rounded-full px-2.5 py-1 text-[0.75rem] font-medium text-white/90">
            Foto ilustrativa · {place.photo.zone}
          </p>
        )}
        <nav className="safe-top absolute inset-x-0 top-0 mx-auto flex max-w-3xl items-center justify-between px-4 pt-3">
          <BackButton />
          <div className="flex gap-2.5">
            <ShareButton title={place.name} text={`${place.name} — ${site.edition}`} />
            <SaveButton slug={place.slug} name={place.name} />
          </div>
        </nav>
      </div>

      {/* Sheet-like content card overlapping the hero */}
      <article className="relative -mt-7 rounded-t-[28px] bg-bg">
        <div className="mx-auto max-w-3xl px-5 pt-7 md:px-8">
          <header className="anim-rise" style={{ "--i": 1 } as React.CSSProperties}>
            <p className="t-eyebrow text-accent">
              {category.singular} · {place.dept}
            </p>
            <h1 className="t-title mt-2 text-balance">{place.name}</h1>
            {place.activities.length > 0 && (
              <p className="mt-2 text-[1.0625rem] leading-snug text-ink-2 text-pretty">{place.activities.join(" · ")}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill icon="calendar">{describeDays(place.days)}</Pill>
              {place.accessibility && /universal|accesib/i.test(place.accessibility) && <Pill icon="access">Accesible</Pill>}
            </div>
          </header>

          {/* Grouped facts, iOS inset-list style */}
          <section
            aria-label="Información"
            className="anim-rise mt-6 overflow-hidden rounded-[20px] bg-surface shadow-[var(--shadow-card)]"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            <a href={directions} target="_blank" rel="noopener noreferrer" className="pressable-row flex items-center gap-3.5 px-4 py-3.5">
              <FactIcon name="pin" />
              <div className="min-w-0 flex-1">
                <p className="t-headline text-pretty">{place.address ?? place.name}</p>
                <p className="t-footnote mt-0.5 text-ink-2">{where}</p>
              </div>
              <Icon name="chevron" size={16} strokeWidth={2.4} className="shrink-0 text-ink-3" />
            </a>
            {place.accessibility && (
              <Fact icon="access" label="Accesibilidad">
                {place.accessibility}
              </Fact>
            )}
            {place.organizer && (
              <Fact icon="people" label="Organiza">
                {place.organizer}
              </Fact>
            )}
          </section>

          {program.length > 0 && (
            <section aria-labelledby="program-title" className="anim-rise mt-9" style={{ "--i": 3 } as React.CSSProperties}>
              <h2 id="program-title" className="t-title-2">
                Programa
              </h2>
              <div className="mt-3 space-y-6">
                {program.map((block, b) => (
                  <div key={b}>
                    {block.day && <h3 className="t-eyebrow mb-2.5 text-ink-2">{block.day}</h3>}
                    <ol className="relative space-y-3 border-l border-separator pl-5">
                      {block.items.map((item, i) => (
                        <li key={i} className="relative">
                          <span aria-hidden="true" className="absolute top-[0.55em] -left-[24.5px] size-2 rounded-full bg-accent ring-4 ring-bg" />
                          {item.time && (
                            <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-ink tabular-nums">
                              <Icon name="clock" size={14} strokeWidth={2.2} className="text-ink-3" />
                              {item.time}
                            </p>
                          )}
                          <p className={`t-subhead text-pretty ${item.time ? "mt-0.5 text-ink-2" : "text-ink"}`}>{item.text}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="related-title" className="mt-12">
              <h2 id="related-title" className="t-title-2">
                Cerca, en {place.dept}
              </h2>
              <div className="rail no-scrollbar -mx-5 mt-3 gap-3 !px-5 pb-2 md:-mx-8 md:!px-8">
                {related.map((r) => (
                  <Link key={r.slug} href={`/lugar/${r.slug}`} className="pressable w-[156px]">
                    <div className="relative aspect-square overflow-hidden rounded-[18px] bg-surface-2">
                      <PlacePhoto slug={r.slug} name={r.name} category={r.category} photo={r.photo} sizes="160px" />
                    </div>
                    <p className="t-subhead mt-2 line-clamp-2 font-semibold">{r.name}</p>
                    <p className="t-footnote mt-0.5 truncate text-ink-2">{r.locality}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <footer className="t-footnote mt-12 space-y-1.5 text-ink-3">
            {place.photo && (
              <p>
                {place.photo.zone ? `Foto ilustrativa de ${place.photo.zone}: ` : "Foto: "}
                <a href={place.photo.page} target="_blank" rel="noreferrer" className="underline decoration-separator underline-offset-2">
                  {place.photo.author}
                </a>
                {place.photo.license && (
                  <>
                    {" · "}
                    {place.photo.licenseUrl ? (
                      <a href={place.photo.licenseUrl} target="_blank" rel="noreferrer" className="underline decoration-separator underline-offset-2">
                        {place.photo.license}
                      </a>
                    ) : (
                      place.photo.license
                    )}
                  </>
                )}{" "}
                · Wikimedia Commons
              </p>
            )}
            <p>
              Fuente: guía oficial del {site.edition}, pág. {place.page}. Confirmá horarios con la institución.
            </p>
          </footer>
        </div>
      </article>

      <DirectionsBar href={directions} label={place.name} />
    </main>
  );
}

function Pill({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-fill px-3 text-[0.875rem] font-medium">
      <Icon name={icon} size={15} strokeWidth={2.1} className="text-ink-2" />
      {children}
    </span>
  );
}

function FactIcon({ name }: { name: IconName }) {
  return (
    <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-on-accent">
      <Icon name={name} size={17} strokeWidth={2.2} />
    </span>
  );
}

function Fact({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 px-4 py-3.5 [&:not(:first-child)]:shadow-[inset_0_0.5px_0_var(--separator)]">
      <FactIcon name={icon} />
      <div className="min-w-0 flex-1">
        <p className="t-footnote text-ink-2">{label}</p>
        <p className="t-subhead mt-0.5 text-pretty">{children}</p>
      </div>
    </div>
  );
}
