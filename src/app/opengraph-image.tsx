import { ImageResponse } from "next/og";
import { site } from "@/config/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} · ${site.tagline}`;

export default function OpenGraphImage() {
  const rays = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f4f0", padding: 80, position: "relative" }}>
        <svg width="520" height="520" viewBox="0 0 100 100" style={{ position: "absolute", right: -60, top: 55 }}>
          <g fill="none" stroke="#b5441b" strokeWidth="3" strokeLinecap="round" opacity="0.9">
            <circle cx="50" cy="50" r="12" />
            <circle cx="50" cy="50" r="3" fill="#b5441b" />
            {rays.map((a, i) => (
              <line key={i} x1={50 + Math.cos(a) * 22} y1={50 + Math.sin(a) * 22} x2={50 + Math.cos(a) * 34} y2={50 + Math.sin(a) * 34} />
            ))}
          </g>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#b5441b", letterSpacing: 2 }}>3 Y 4 DE OCTUBRE · URUGUAY</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 104, fontWeight: 800, color: "#1b1916", letterSpacing: -4, lineHeight: 1 }}>Día del</div>
            <div style={{ fontSize: 104, fontWeight: 800, color: "#1b1916", letterSpacing: -4, lineHeight: 1 }}>Patrimonio</div>
            <div style={{ fontSize: 36, color: "#6b655c", marginTop: 24 }}>Fotos, horarios y cómo llegar a cada lugar.</div>
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#1b1916" }}>{site.name}</div>
        </div>
      </div>
    ),
    size,
  );
}
