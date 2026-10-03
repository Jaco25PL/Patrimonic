"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "native" | "ios";

/**
 * "Instalar" pill. Uses the native prompt where the browser offers one (Chrome/Android/desktop)
 * and shows the Share → "Agregar a inicio" steps on iOS Safari, which has no prompt API.
 */
export function InstallButton() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    if (isIOS) setMode("ios");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("native");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "hidden") return null;

  const onClick = async () => {
    if (mode === "native" && deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setMode("hidden");
      setDeferred(null);
    } else {
      setSheet(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="pressable anim-fade inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-[0.8125rem] font-semibold text-accent"
      >
        <Icon name="install" size={16} strokeWidth={2.1} />
        Instalar app
      </button>
      {sheet && <IOSInstallSheet onClose={() => setSheet(false)} />}
    </>
  );
}

function IOSInstallSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="sheet-scrim absolute inset-0 bg-black/40" />
      <div className="sheet-panel safe-bottom absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[28px] bg-surface px-6 pt-3 shadow-[var(--shadow-float)]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-fill-strong" />
        <h2 id="install-title" className="t-title-2 mt-5">
          Llevala en tu pantalla de inicio
        </h2>
        <p className="t-subhead mt-1.5 text-ink-2">Se abre a pantalla completa, como una app, y funciona aunque tengas poca señal.</p>
        <ol className="mt-5 space-y-3">
          <Step n={1} icon="share">
            Tocá <strong className="font-semibold">Compartir</strong> en la barra de Safari.
          </Step>
          <Step n={2} icon="plusSquare">
            Elegí <strong className="font-semibold">Agregar a inicio</strong>.
          </Step>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="pressable mt-6 mb-2 h-[52px] w-full rounded-2xl bg-accent text-[1.0625rem] font-semibold text-on-accent"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

function Step({ n, icon, children }: { n: number; icon: "share" | "plusSquare"; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 rounded-2xl bg-fill px-4 py-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-[0.8125rem] font-bold tabular-nums">{n}</span>
      <span className="t-subhead flex-1">{children}</span>
      <Icon name={icon} size={22} className="shrink-0 text-accent" />
    </li>
  );
}
