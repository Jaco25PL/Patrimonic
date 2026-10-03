import { Icon } from "@/components/Icon";

/** The primary action, always within thumb reach, floating over the content. */
export function DirectionsBar({ href, label }: { href: string; label: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="h-6 bg-gradient-to-t from-bg to-transparent" />
      <div className="safe-bottom pointer-events-auto bg-bg px-4 pt-1">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Cómo llegar a ${label} (abre Google Maps)`}
          className="pressable mx-auto flex h-[54px] max-w-xl items-center justify-center gap-2.5 rounded-2xl bg-accent text-[1.0625rem] font-semibold tracking-[-0.01em] text-on-accent shadow-[0_8px_24px_-8px_var(--accent)] active:bg-[var(--accent-pressed)]"
        >
          <Icon name="directions" size={22} strokeWidth={2} />
          Cómo llegar
        </a>
      </div>
    </div>
  );
}
