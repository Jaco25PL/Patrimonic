import { site } from "@/config/site";
import type { Day } from "./place";

export const DAY_LABEL: Record<Day, { short: string; long: string }> = {
  sab: { short: "Sáb 3", long: "Sábado 3" },
  dom: { short: "Dom 4", long: "Domingo 4" },
};

/** The event day matching `now` in Uruguay, if the event is happening. */
export function currentEventDay(now = new Date()): Day | null {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(now);
  if (today === site.dates.sab) return "sab";
  if (today === site.dates.dom) return "dom";
  return null;
}

export function describeDays(days: Day[]): string {
  if (days.length === 2) return "Sábado y domingo";
  return days[0] === "sab" ? "Solo sábado" : "Solo domingo";
}
