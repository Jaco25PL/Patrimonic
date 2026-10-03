"use client";

import { useRef } from "react";
import { Icon } from "@/components/Icon";

export function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl bg-fill px-2.5 text-ink-2 transition-colors focus-within:bg-fill-strong">
      <Icon name="search" size={18} strokeWidth={2.2} className="shrink-0" />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ref.current?.blur()}
        placeholder="Buscar lugar, barrio o ciudad"
        aria-label="Buscar"
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] tracking-[-0.01em] text-ink placeholder:text-ink-3 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          aria-label="Borrar búsqueda"
          className="pressable grid size-6 place-items-center rounded-full bg-ink-3 text-bg"
        >
          <Icon name="close" size={12} strokeWidth={3} />
        </button>
      )}
    </label>
  );
}
