import type { Metadata } from "next";
import { MapPin, Phone, Clock, Mail, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonA } from "@/components/ui/button";
import { InstagramIcon, WhatsAppIcon } from "@/components/site/brand-icons";
import { getSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/whatsapp";
import { BRAND } from "@/config/site";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Ubicación y contacto",
  description: "Dirección, WhatsApp e Instagram de TIM REPUESTOS en Garín, Buenos Aires.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactoPage() {
  const s = await getSettings();
  const items = [
    { icon: MapPin, label: "Dirección", value: s.address, href: s.maps_url ?? undefined, cta: "Abrir en Google Maps" },
    s.phone_display
      ? { icon: Phone, label: "Teléfono / WhatsApp", value: s.phone_display, href: `tel:+${s.whatsapp_number}`, cta: "Llamar" }
      : null,
    s.email_public ? { icon: Mail, label: "Email", value: s.email_public, href: `mailto:${s.email_public}`, cta: "Escribir" } : null,
    { icon: Clock, label: "Horarios", value: s.business_hours ?? "Consultá los horarios por WhatsApp." },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; href?: string; cta?: string }[];

  return (
    <>
      <PageHero eyebrow="Contacto" title="Ubicación y contacto">
        Escribinos por WhatsApp o acercate al local.
      </PageHero>
      <section className="container-page grid gap-8 py-14 lg:grid-cols-[1.2fr_1fr]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, label, value, href, cta }) => (
            <li key={label} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-white p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-graphite text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-sm font-semibold uppercase tracking-[0.1em] text-muted">{label}</h2>
              <p className="mt-1 whitespace-pre-line text-lg font-semibold">{value}</p>
              {href && cta ? (
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-ink hover:underline"
                >
                  {cta} <ArrowRight className="size-4" aria-hidden />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="on-dark flex flex-col justify-between gap-8 rounded-[var(--radius-card)] bg-graphite p-8 text-white">
          <div>
            <h2 className="text-2xl font-semibold">¿Necesitás un repuesto?</h2>
            <p className="mt-3 leading-7 text-white/80">
              Contanos marca, modelo, año y motor del vehículo, y si podés el código de la pieza o una foto. Te ayudamos a identificarla.
            </p>
          </div>
          <div className="grid gap-3">
            <ButtonA href={whatsappUrl(s.whatsapp_number, "Hola TIM REPUESTOS, quiero consultar por un repuesto.")} target="_blank" rel="noopener noreferrer" size="lg">
              <WhatsAppIcon /> Escribir por WhatsApp
            </ButtonA>
            {s.instagram_url ? (
              <ButtonA href={s.instagram_url} target="_blank" rel="noopener noreferrer" variant="outline-dark" size="lg">
                <InstagramIcon /> {BRAND.instagramHandle}
              </ButtonA>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
