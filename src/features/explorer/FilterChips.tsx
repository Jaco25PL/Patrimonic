"use client";

import { CATEGORIES } from "@/domain/categories";
import type { Criteria } from "@/domain/filter";
import { Icon } from "@/components/Icon";

const chip =
  "pressable inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-medium tracking-[-0.01em] transition-colors duration-200";
const idle = "bg-fill text-ink";
const on = "bg-ink text-bg";

export function FilterChips({
  criteria,
  update,
  departments,
  localities,
  savedCount,
}: {
  criteria: Criteria;
  update: (patch: Partial<Criteria>) => void;
  departments: { name: string; count: number }[];
  localities: { name: string; dept: string; count: number }[];
  savedCount: number;
}) {
  const deptActive = criteria.dept !== "all";
  const locActive = criteria.locality !== "all";
  const visibleLocalities = deptActive ? localities.filter((l) => l.dept === criteria.dept) : localities;
  const byDept = new Map<string, typeof localities>();
  for (const l of visibleLocalities) byDept.set(l.dept, [...(byDept.get(l.dept) ?? []), l]);
  return (
    <div className="rail no-scrollbar gap-2 py-0.5">
      {/* Native select: gets the platform picker wheel on iOS for free. */}
      <label className={`${chip} relative ${deptActive ? on : idle}`}>
        <Icon name="pin" size={15} strokeWidth={2.2} />
        <span>{deptActive ? criteria.dept : "Departamento"}</span>
        <Icon name="down" size={14} strokeWidth={2.4} className="-mr-1 opacity-60" />
        <select
          aria-label="Departamento"
          value={criteria.dept}
          onChange={(e) => update({ dept: e.target.value, locality: "all" })}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="all">Todos los departamentos</option>
          {departments.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.count})
            </option>
          ))}
        </select>
      </label>

      <label className={`${chip} relative ${locActive ? on : idle}`}>
        <span>{locActive ? criteria.locality : "Localidad"}</span>
        <Icon name="down" size={14} strokeWidth={2.4} className="-mr-1 opacity-60" />
        <select
          aria-label="Localidad"
          value={locActive ? `${criteria.dept}/${criteria.locality}` : "all"}
          onChange={(e) => {
            if (e.target.value === "all") return update({ locality: "all" });
            const [dept, ...rest] = e.target.value.split("/");
            update({ dept, locality: rest.join("/") });
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="all">{deptActive ? `Todo ${criteria.dept}` : "Todas las localidades"}</option>
          {[...byDept].map(([dept, list]) => (
            <optgroup key={dept} label={dept}>
              {list.map((l) => (
                <option key={`${dept}/${l.name}`} value={`${dept}/${l.name}`}>
                  {l.name} ({l.count})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <button
        type="button"
        aria-pressed={criteria.onlySaved}
        onClick={() => update({ onlySaved: !criteria.onlySaved })}
        className={`${chip} ${criteria.onlySaved ? "bg-accent text-on-accent" : idle}`}
      >
        <Icon name="heart" size={15} strokeWidth={2.2} filled={criteria.onlySaved} />
        Mi recorrido{savedCount > 0 && <span className="tabular-nums opacity-70">{savedCount}</span>}
      </button>

      <span aria-hidden="true" className="my-1.5 w-px shrink-0 bg-separator" />

      {CATEGORIES.map((c) => {
        const active = criteria.category === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={active}
            onClick={() => update({ category: active ? "all" : c.id })}
            className={`${chip} ${active ? on : idle}`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
