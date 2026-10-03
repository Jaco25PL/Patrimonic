import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="t-eyebrow text-accent">404</p>
        <h1 className="t-title mt-2">Esta puerta está cerrada</h1>
        <p className="t-subhead mt-2 text-ink-2">No encontramos ese lugar en la guía.</p>
        <Link href="/" className="pressable mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-on-accent">
          Ver todos los lugares
        </Link>
      </div>
    </main>
  );
}
