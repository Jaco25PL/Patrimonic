"use client";

import { useEffect, useState } from "react";

/** Tiny status toast, triggered with: window.dispatchEvent(new CustomEvent("huella:toast", { detail })) */
export function Toast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 2000);
    };
    window.addEventListener("huella:toast", onToast);
    return () => {
      window.removeEventListener("huella:toast", onToast);
      clearTimeout(timer);
    };
  }, []);
  if (!message) return null;
  return (
    <div role="status" className="toast fixed inset-x-0 top-0 z-50 flex justify-center safe-top">
      <p className="material mt-3 rounded-full px-4 py-2 text-[0.9375rem] font-semibold shadow-[var(--shadow-float)]">{message}</p>
    </div>
  );
}
