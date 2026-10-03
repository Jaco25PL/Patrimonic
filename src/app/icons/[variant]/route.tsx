import { ImageResponse } from "next/og";
import { AppIcon } from "../../app-icon-art";

const VARIANTS = { "192": { size: 192, pad: 0 }, "512": { size: 512, pad: 0 }, maskable: { size: 512, pad: 0.12 } } as const;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const v = VARIANTS[variant as keyof typeof VARIANTS] ?? VARIANTS["512"];
  return new ImageResponse(<AppIcon size={v.size} pad={v.pad} />, { width: v.size, height: v.size });
}
