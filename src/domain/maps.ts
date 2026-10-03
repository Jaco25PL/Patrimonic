import type { Place } from "./place";

/** Text Google Maps can geocode reliably: venue, street, town, department. */
export function mapsQuery(place: Pick<Place, "name" | "address" | "locality" | "dept">): string {
  const parts = [place.name, place.address, place.locality, place.dept, "Uruguay"];
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => Boolean(p))
    .filter((p) => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

/** Universal link: opens the Google Maps app when installed, the web otherwise. */
export function directionsUrl(place: Pick<Place, "name" | "address" | "locality" | "dept">): string {
  const params = new URLSearchParams({ api: "1", destination: mapsQuery(place) });
  return `https://www.google.com/maps/dir/?${params}`;
}
