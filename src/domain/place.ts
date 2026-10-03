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
  /** Pre-normalized haystack for instant search. */
  search: string;
}
