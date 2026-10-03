/** Single source of truth for branding. Rename the app here. */
export const site = {
  name: "Huella",
  tagline: "Guía del Día del Patrimonio",
  description:
    "Los lugares que abren sus puertas el Día del Patrimonio 2026 en todo Uruguay. Fotos, horarios y cómo llegar, en un toque.",
  edition: "Día del Patrimonio 2026",
  theme: "Raíces indígenas: pasado, presente y futuro",
  dates: { sab: "2026-10-03", dom: "2026-10-04" },
  source: "Guía oficial de actividades · Comisión del Patrimonio Cultural de la Nación (MEC)",
  sourceUrl: "https://diadelpatrimonio.mec.gub.uy",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://huella.vercel.app",
} as const;
