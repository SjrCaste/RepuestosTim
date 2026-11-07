import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, MessageCircle, Search } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonA } from "@/components/ui/button";
import { InstagramIcon } from "@/components/site/brand-icons";
import { getSettings } from "@/lib/settings";
import { BRAND } from "@/config/site";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Nosotros",
  description: "TIM REPUESTOS: local de repuestos para tu vehículo en Cjal. Larroca 1197, Garín, Buenos Aires.",
  alternates: { canonical: "/nosotros" },
};

export default async function NosotrosPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="Nosotros" title="TIM REPUESTOS, en Garín">
        Un local de repuestos para tu vehículo, con atención personalizada.
      </PageHero>
      <section className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5 text-[17px] leading-8 text-carbon">
          <p>
            Estamos en <strong>{s.address}</strong>. Atendemos en el local y por WhatsApp para ayudarte a identificar el repuesto que
            necesitás.
          </p>
          <p>
            Armamos este catálogo en línea para que nuestros clientes puedan buscar piezas por código, nombre, marca o rubro, y enviarnos
            su consulta con las cantidades en un solo paso.
          </p>
          <ul className="grid gap-3 pt-2 text-[15px]">
            <li className="flex gap-3">
              <MessageCircle className="mt-1 size-5 shrink-0 text-brand-ink" aria-hidden /> Atención directa con el local.
            </li>
            <li className="flex gap-3">
              <Search className="mt-1 size-5 shrink-0 text-brand-ink" aria-hidden /> Catálogo con búsqueda por código para clientes registrados.
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-1 size-5 shrink-0 text-brand-ink" aria-hidden /> {s.address}
            </li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-3">
            {s.maps_url ? (
              <ButtonA href={s.maps_url} target="_blank" rel="noopener noreferrer" variant="dark">
                <MapPin aria-hidden /> Cómo llegar
              </ButtonA>
            ) : null}
            {s.instagram_url ? (
              <ButtonA href={s.instagram_url} target="_blank" rel="noopener noreferrer" variant="outline">
                <InstagramIcon /> {BRAND.instagramHandle}
              </ButtonA>
            ) : null}
          </div>
        </div>
        {s.about_image_url ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line">
            <Image src={s.about_image_url} alt={`Local de ${s.store_name}`} fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
          </div>
        ) : (
          <div className="tech-grid-light grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-white">
            <div className="text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-graphite text-brand">
                <MapPin className="size-7" aria-hidden />
              </span>
              <p className="mt-4 font-display text-xl font-semibold">{s.store_name}</p>
              <p className="mt-1 text-muted">{s.address}</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
