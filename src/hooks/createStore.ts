/**
 * Minimal observable store (observer pattern) persisted to Web Storage.
 * Survives client-side navigations (module scope) and reloads (storage),
 * and is read with useSyncExternalStore so SSR and hydration stay consistent.
 */
export function createStore<T>(key: string, initial: T, storage: "local" | "session" = "local") {
  let state = initial;
  let hydrated = false;
  const listeners = new Set<() => void>();

  const area = () => {
    try {
      return storage === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };

  function hydrate() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    try {
      const raw = area()?.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = (Array.isArray(initial) ? parsed : { ...initial, ...parsed }) as T;
      }
    } catch {
      /* private mode or corrupted value: keep defaults */
    }
  }

  return {
    get: () => {
      hydrate();
      return state;
    },
    getServer: () => initial,
    set(next: T | ((prev: T) => T)) {
      hydrate();
      state = typeof next === "function" ? (next as (prev: T) => T)(state) : next;
      try {
        area()?.setItem(key, JSON.stringify(state));
      } catch {
        /* storage full or blocked */
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        hydrated = false;
        hydrate();
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}
