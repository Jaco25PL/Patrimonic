"use client";

import { useSyncExternalStore } from "react";
import { EMPTY_CRITERIA, type Criteria } from "@/domain/filter";
import { createStore } from "@/hooks/createStore";

/** Filters live outside the component so they survive going into a place and back. */
const store = createStore<Criteria>("huella:criteria", EMPTY_CRITERIA, "session");

export function useCriteria() {
  const criteria = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  const update = (patch: Partial<Criteria>) => store.set((prev) => ({ ...prev, ...patch }));
  const reset = () => store.set((prev) => ({ ...EMPTY_CRITERIA, day: prev.day }));
  return { criteria, update, reset };
}
