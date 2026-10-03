import Link from "next/link";
import type { PlaceSummary } from "@/domain/place";
import { DAY_LABEL } from "@/domain/days";
import { PlacePhoto } from "@/components/PlacePhoto";
import { Icon } from "@/components/Icon";

export function PlaceRow({ place, saved }: { place: PlaceSummary; saved: boolean }) {
  return (
    <li className="cv-auto">
      <Link
        href={`/lugar/${place.slug}`}
        prefetch={false}
        className="pressable-row group flex items-center gap-3.5 rounded-2xl px-2 py-2.5 -mx-2"
      >
        <div className="relative size-[60px] shrink-0 overflow-hidden rounded-[14px] bg-surface-2">
          <PlacePhoto slug={place.slug} name={place.name} category={place.category} photo={place.photo} sizes="64px" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="t-headline line-clamp-2 text-pretty">{place.name}</h3>
          {place.activity && <p className="t-subhead mt-0.5 line-clamp-1 text-ink-2">{place.activity}</p>}
          <div className="t-footnote mt-1 flex items-center gap-1.5 text-ink-3">
            {saved && <Icon name="heart" size={12} filled className="text-accent" />}
            <span className="truncate">{place.address ?? place.locality}</span>
            {place.days.length === 1 && (
              <span className="shrink-0 rounded-full bg-accent-soft px-1.5 py-px text-[0.6875rem] font-semibold text-accent">
                {DAY_LABEL[place.days[0]!].short}
              </span>
            )}
          </div>
        </div>
        <Icon name="chevron" size={16} strokeWidth={2.4} className="shrink-0 text-ink-3" />
      </Link>
    </li>
  );
}
