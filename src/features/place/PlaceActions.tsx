"use client";

import { useRouter } from "next/navigation";
import { useSaved } from "@/hooks/useSaved";
import { Icon } from "@/components/Icon";
import { hasInAppHistory } from "@/components/NavigationTracker";

const glass = "pressable material-dark grid size-10 place-items-center rounded-full text-white";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Volver"
      className={glass}
      onClick={() => {
        // Go back when we came from inside the app (keeps scroll & filters), otherwise land on home.
        if (hasInAppHistory()) router.back();
        else router.push("/");
      }}
    >
      <Icon name="back" size={20} strokeWidth={2.4} className="-ml-0.5" />
    </button>
  );
}

export function SaveButton({ slug, name }: { slug: string; name: string }) {
  const { saved, toggle } = useSaved();
  const on = saved.has(slug);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Quitar ${name} de mi recorrido` : `Agregar ${name} a mi recorrido`}
      onClick={() => toggle(slug)}
      className={glass}
    >
      <Icon name="heart" size={20} strokeWidth={2.2} filled={on} className={`transition-transform duration-300 ease-out ${on ? "scale-110 text-[#ff6b5a]" : ""}`} />
    </button>
  );
}

export function ShareButton({ title, text }: { title: string; text: string }) {
  const onShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        window.dispatchEvent(new CustomEvent("huella:toast", { detail: "Enlace copiado" }));
      }
    } catch {
      /* user cancelled */
    }
  };
  return (
    <button type="button" aria-label="Compartir" onClick={onShare} className={glass}>
      <Icon name="share" size={20} strokeWidth={2.1} className="-mt-0.5" />
    </button>
  );
}
