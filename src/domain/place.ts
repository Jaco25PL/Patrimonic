export type Day = "sab" | "dom";

export type CategoryId =
  | "museos"
  | "palacios"
  | "faros"
  | "iglesias"
  | "teatros"
  | "naturaleza"
  | "bodegas"
  | "recorridos"
  | "militar"
  | "embajadas"
  | "cultura";

export interface Photo {
  src: string;
  width: number;
  height: number;
  blur: string | null;
  author: string;
  license: string | null;
  licenseUrl: string | null;
  page: string;
  /** Found by the automatic search (not hand-picked): never used to lead the rail unfiltered. */
  auto?: boolean;
  /** Set when no photo of the place exists: an illustrative photo of this barrio/town/department. */
  zone?: string;
}

/** A venue taking part in the event, as published in the official guide. */
export interface Place {
  id: number;
  slug: string;
  name: string;
  activities: string[];
  dept: string;
  locality: string;
  municipio: string | null;
  address: string | null;
  program: string[];
  accessibility: string | null;
  organizer: string | null;
  days: Day[];
  category: CategoryId;
  page: number;
  photo: Photo | null;
}

/** The slim projection shipped to the client for listing & search. */
export interface PlaceSummary {
  slug: string;
  name: string;
  activity: string | null;
  dept: string;
  locality: string;
  address: string | null;
  days: Day[];
  category: CategoryId;
  photo: Pick<Photo, "src" | "blur"> | null;
  /** Position in the curated "Imperdibles" order; lower is more iconic. Null when not curated. */
  rank: number | null;
  /** True when the photo shows the zone, not the place itself (kept out of "Imperdibles"). */
  illustrative: boolean;
  /** Pre-normalized haystack for instant search. */
  search: string;
}
