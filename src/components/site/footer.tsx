import Link from "next/link";
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { Logo } from "./logo";
import { InstagramIcon, WhatsAppIcon } from "./brand-icons";
import { whatsappUrl } from "@/lib/whatsapp";
import { BRAND } from "@/config/site";
import type { LoadedSettings } from "@/lib/settings";

export function SiteFooter({ settings }: { settings: LoadedSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark bg-graphite text-white">
      <div className="container-page grid gap-6 py-8 sm:gap-10 sm:py-14 md:grid-cols-[1.3fr_1fr_1fr] lg:py-16">
        <div>
          <Logo dark />
          <p className="mt-4 hidden max-w-sm text-[15px] leading-7 text-muted-dark sm:block">
            Repuestos para tu vehículo y atención personalizada en Garín, Buenos Aires.
          </p>
          <div className="mt-4 flex gap-2 sm:mt-6">
            {settings.instagram_url ? (
              <a
                href={settings.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 place-items-center rounded-lg border border-white/15 text-white/90 transition-colors hover:border-brand hover:text-brand"
                aria-label={`Instagram ${BRAND.instagramHandle} (se abre en otra pestaña)`}
              >
                <InstagramIcon className="size-5" />
              </a>
            ) : null}
            <a
              href={whatsappUrl(settings.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-10 place-items-center rounded-lg border border-white/15 text-white/90 transition-colors hover:border-brand hover:text-brand"
              aria-label="WhatsApp (se abre en otra pestaña)"
            >
              <WhatsAppIcon className="size-5" />
            </a>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Contacto</h2>
          <ul className="mt-4 space-y-3 text-[15px] text-white/85">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-muted-dark" aria-hidden />
              <span>{settings.address}</span>
            </li>
            {settings.phone_display ? (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-muted-dark" aria-hidden />
                <a href={`tel:+${settings.whatsapp_number}`} className="hover:text-brand">
                  {settings.phone_display}
                </a>
              </li>
            ) : null}
            {settings.email_public ? (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-muted-dark" aria-hidden />
                <a href={`mailto:${settings.email_public}`} className="hover:text-brand">
                  {settings.email_public}
                </a>
              </li>
            ) : null}
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-muted-dark" aria-hidden />
              <span className="whitespace-pre-line">{settings.business_hours ?? "Consultá horarios por WhatsApp"}</span>
            </li>
          </ul>
        </div>

        <div className="hidden md:block">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-brand">Sitio</h2>
          <ul className="mt-4 grid gap-2.5 text-[15px] text-white/85">
            <li><Link className="hover:text-brand" href="/categorias">Categorías</Link></li>
            <li><Link className="hover:text-brand" href="/como-comprar">Cómo comprar</Link></li>
            <li><Link className="hover:text-brand" href="/nosotros">Nosotros</Link></li>
            <li><Link className="hover:text-brand" href="/catalogo">Catálogo para clientes</Link></li>
            <li><Link className="hover:text-brand" href="/privacidad">Política de privacidad</Link></li>
            <li><Link className="hover:text-brand" href="/terminos">Términos de uso</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-[13px] text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.store_name}. Garín, Buenos Aires.</p>
          <p className="flex gap-4"><Link className="hover:text-brand" href="/privacidad">Privacidad</Link><Link className="hover:text-brand" href="/terminos">Términos</Link></p>
        </div>
      </div>
    </footer>
  );
}
