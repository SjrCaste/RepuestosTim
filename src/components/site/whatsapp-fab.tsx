import { WhatsAppIcon } from "./brand-icons";
import { whatsappUrl } from "@/lib/whatsapp";

/** Botón flotante de WhatsApp con mensaje contextual. */
export function WhatsAppFab({ number, message, label = "Consultar por WhatsApp" }: { number: string; message?: string; label?: string }) {
  return (
    <a
      href={whatsappUrl(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-30 inline-flex h-14 items-center gap-2.5 rounded-full bg-graphite pl-4 pr-5 text-[15px] font-semibold text-white shadow-[var(--shadow-lift)] ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
      aria-label={`${label} (se abre WhatsApp en otra pestaña)`}
    >
      <span className="grid size-8 place-items-center rounded-full bg-brand text-graphite">
        <WhatsAppIcon className="size-[18px]" />
      </span>
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">WhatsApp</span>
    </a>
  );
}
