/** App icon artwork (rendered to PNG by next/og): an ochre sun pictograph on warm paper. */
export function AppIcon({ size, pad = 0, rounded = false }: { size: number; pad?: number; rounded?: boolean }) {
  const inner = size * (1 - pad * 2);
  const rays = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
  const c = 50;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #c9542a 0%, #9e3512 100%)",
        borderRadius: rounded ? size * 0.225 : 0,
      }}
    >
      <svg width={inner * 0.78} height={inner * 0.78} viewBox="0 0 100 100">
        <g fill="none" stroke="#fbf3ea" strokeWidth="6.5" strokeLinecap="round">
          <circle cx={c} cy={c} r="12" />
          {rays.map((a, i) => (
            <line key={i} x1={c + Math.cos(a) * 25} y1={c + Math.sin(a) * 25} x2={c + Math.cos(a) * 38} y2={c + Math.sin(a) * 38} />
          ))}
        </g>
      </svg>
    </div>
  );
}
