"use client";

interface Option<T extends string> {
  value: T;
  label: string;
}

/** iOS-style segmented control; the thumb glides with a transform (compositor only). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-[11px] bg-fill p-[2px]" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden="true"
        className="absolute top-[2px] bottom-[2px] left-[2px] rounded-[9px] bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative z-10 h-8 rounded-[9px] text-[0.8125rem] font-semibold tracking-[-0.01em] transition-colors duration-200 ${active ? "text-ink" : "text-ink-2"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
