import type { CategoryId } from "@/domain/place";
import { getCategory } from "@/domain/categories";

/** Small deterministic PRNG so each place always gets the same artwork. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/* Motifs loosely inspired by the pictographs of Chamangá (Flores):
   suns, concentric rings, zig-zag waters, combs and dotted trails. */
function Motif({ kind, x, y, s, r }: { kind: number; x: number; y: number; s: number; r: number }) {
  const t = `translate(${x} ${y}) rotate(${r}) scale(${s})`;
  switch (kind) {
    case 0:
      return (
        <g transform={t}>
          <circle r="22" />
          <circle r="4" fill="currentColor" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * 42} y2={Math.sin(a) * 42} />;
          })}
        </g>
      );
    case 1:
      return (
        <g transform={t}>
          <circle r="12" />
          <circle r="26" />
          <circle r="40" />
        </g>
      );
    case 2:
      return (
        <g transform={t}>
          <path d="M-50 0 l12 -14 l12 14 l12 -14 l12 14 l12 -14 l12 14 l12 -14 l12 14" />
          <path d="M-50 16 l12 -14 l12 14 l12 -14 l12 14 l12 -14 l12 14 l12 -14 l12 14" />
        </g>
      );
    case 3:
      return (
        <g transform={t}>
          <line x1="-40" y1="0" x2="40" y2="0" />
          {[-30, -15, 0, 15, 30].map((dx) => (
            <line key={dx} x1={dx} y1="0" x2={dx} y2="18" />
          ))}
        </g>
      );
    case 4:
      return (
        <g transform={t}>
          <circle r="24" />
          <line x1="-24" y1="0" x2="24" y2="0" />
          <line x1="0" y1="-24" x2="0" y2="24" />
        </g>
      );
    default:
      return (
        <g transform={t} fill="currentColor" stroke="none">
          {Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx={i * 12 - 36} cy={Math.sin(i) * 6} r="3" />
          ))}
        </g>
      );
  }
}

export function Poster({ seed, category, className = "" }: { seed: string; category: CategoryId; className?: string }) {
  const rand = seeded(seed);
  const hue = Math.round(getCategory(category).hue + (rand() - 0.5) * 70);
  const hero = { kind: Math.floor(rand() * 5), x: 120 + rand() * 200, y: 120 + rand() * 180, s: 2.6 + rand() * 1.6, r: rand() * 360 };
  const small = Array.from({ length: 5 }, () => ({
    kind: Math.floor(rand() * 6),
    x: rand() * 400,
    y: rand() * 500,
    s: 0.5 + rand() * 0.6,
    r: rand() * 360,
  }));
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      style={{ color: `oklch(0.9 0.07 ${hue} / 0.32)` }}
    >
      <defs>
        <linearGradient id={`g-${seed}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={`oklch(0.62 0.11 ${hue})`} />
          <stop offset="1" stopColor={`oklch(0.36 0.08 ${hue + 30})`} />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#g-${seed})`} />
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <Motif {...hero} />
        {small.map((m, i) => (
          <Motif key={i} {...m} />
        ))}
      </g>
    </svg>
  );
}
