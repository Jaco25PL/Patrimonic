import "server-only";

import type { Photo, Place, PlaceSummary } from "@/domain/place";
import { getCategory } from "@/domain/categories";
import { normalize } from "@/domain/text";
import rawPlaces from "./places.json";
import photos from "./photos.generated.json";
import photoSources from "../../data/photo-sources.json";

type RawPlace = Omit<Place, "photo">;

const photoBySlug = photos as Record<string, Photo>;

/** Department order follows the printed guide (capital first, then by region). */
export const DEPARTMENTS = [
  "Montevideo",
  "Canelones",
  "Colonia",
  "San José",
  "Soriano",
  "Paysandú",
  "Río Negro",
  "Salto",
  "Artigas",
  "Cerro Largo",
  "Rivera",
  "Tacuarembó",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Rocha",
  "Treinta y Tres",
] as const;

const places: Place[] = (rawPlaces as RawPlace[]).map((p) => ({ ...p, photo: photoBySlug[p.slug] ?? null }));
const bySlug = new Map(places.map((p) => [p.slug, p]));

/** Curated order of the "Imperdibles" rail; only places whose photo resolved. */
const featuredOrder = Object.keys((photoSources as { places: Record<string, string[]> }).places);

export function getAllPlaces(): Place[] {
  return places;
}

export function getPlace(slug: string): Place | undefined {
  return bySlug.get(slug);
}

export function getFeatured(limit = 14): Place[] {
  return featuredOrder
    .map((slug) => bySlug.get(slug))
    .filter((p): p is Place => Boolean(p?.photo))
    .slice(0, limit);
}

export function toSummary(p: Place): PlaceSummary {
  const activity = p.activities[0] ?? null;
  return {
    slug: p.slug,
    name: p.name,
    activity,
    dept: p.dept,
    locality: p.locality,
    address: p.address,
    days: p.days,
    category: p.category,
    photo: p.photo ? { src: p.photo.src, blur: null } : null,
    search: normalize(
      [p.name, activity, p.locality, p.dept, p.address, getCategory(p.category).label, p.municipio].join(" "),
    ),
  };
}

/** Same venue nearby: same locality first, then same department. */
export function getRelated(place: Place, limit = 6): Place[] {
  const score = (p: Place) => (p.locality === place.locality ? 2 : 0) + (p.photo ? 1 : 0);
  return places
    .filter((p) => p.slug !== place.slug && p.dept === place.dept)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}
