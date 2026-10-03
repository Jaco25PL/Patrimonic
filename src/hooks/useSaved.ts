"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { createStore } from "./createStore";

const store = createStore<string[]>("huella:saved", []);

/** Places the user saved for their own route ("Mi recorrido"). */
export function useSaved() {
  const list = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  const saved = useMemo(() => new Set(list), [list]);
  const toggle = useCallback((slug: string) => {
    store.set((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
    if ("vibrate" in navigator) navigator.vibrate?.(8);
  }, []);
  return { saved, toggle, count: list.length };
}
