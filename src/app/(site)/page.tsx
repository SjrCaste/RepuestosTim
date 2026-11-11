import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, Lock, LayoutGrid, ListChecks, MapPin, Store, CircleCheck } from "lucide-react";
import { ButtonA } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { getPublicCategories, getSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/whatsapp";
import { siteUrl } from "@/lib/env";

export const revalidate = 300;

export default async function HomePage() {
  const [settings, categories] = await Promise.all([getSettings(), getPublicCategories()]);
  const waGeneral = whatsappUrl(settings.whatsapp_number, "Hola TIM REPUESTOS, quiero consultar por un repuesto.");

  const sections = [
    { href: "/catalogo", icon: Lock, title: "Catálogo", text: "Códigos y fichas. Requiere cuenta.", featured: true },
    { href: "/categorias", icon: LayoutGrid, title: "Rubros", text: categories.length ? `${categories.length} familias de productos` : "Familias de productos" },
    { href: "/como-comprar", icon: ListChecks, title: "Cómo comprar", text: "Pasos y preguntas frecuentes" },
    { href: "/contacto", icon: MapPin, title: "Ubicación", text: "Dirección y contacto" },
    { href: "/nosotros", icon: Store, title: "Nosotros", text: "El local en Garín" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: settings.store_name,
    url: siteUrl(),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cjal. Larroca 1197",
      addressLocality: "Garín",
      addressRegion: "Buenos Aires",
      addressCountry: "AR",
    },
    ...(settings.whatsapp_confirmed ? { telephone: `+${settings.whatsapp_number}` } : {}),
    ...(settings.instagram_url ? { sameAs: [settings.instagram_url] } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* HERO + BUSCADOR */}
      <section className="on-dark relative overflow-hidden bg-graphite text-white">
        <div className="tech-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_20%,black_20%,transparent_75%)]" aria-hidden />
        <div aria-hidden className="absolute -right-32 -top-40 size-[520px] rounded-full bg-brand/10 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-9 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="animate-fade-up">
            <p className="eyebrow">
              <span className="h-px w-6 bg-brand" aria-hidden /> Repuestos · Garín
            </p>
            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
              El repuesto que necesitás. <span className="text-brand">Más fácil de encontrar.</span>
            </h1>
            <p className="mt-4 hidden max-w-xl text-lg leading-8 text-white/80 sm:block">
              Buscá por código, nombre o marca y consultá precio y disponibilidad por WhatsApp.
            </p>

            <form action="/catalogo" method="get" role="search" className="mt-6 flex gap-2 sm:mt-8">
              <label htmlFor="home-q" className="sr-only">
                Código, nombre o marca del repuesto
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  id="home-q"
                  name="q"
                  type="search"
                  maxLength={120}
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="Código o nombre"
                  className="h-13 w-full rounded-xl border border-white/10 bg-white pl-11 pr-3 text-base text-graphite placeholder:text-muted/80 focus:outline-none focus:ring-3 focus:ring-brand/50"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-semibold text-graphite transition-colors hover:bg-brand-hover sm:px-6"
                aria-label="Buscar"
              >
                <ArrowRight className="size-5 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Buscar</span>
              </button>
            </form>
            <p className="mt-2.5 flex items-center gap-1.5 text-[13px] text-white/60">
              <Lock className="size-3.5" aria-hidden /> Los resultados se ven con tu cuenta.
            </p>

            <ButtonA href={waGeneral} target="_blank" rel="noopener noreferrer" variant="outline-dark" size="lg" className="mt-6 hidden sm:inline-flex">
              <WhatsAppIcon /> Consultar por WhatsApp
            </ButtonA>
          </div>

          <div className="relative hidden lg:block">
            {settings.hero_image_url ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/10">
                <Image
                  src={settings.hero_image_url}
                  alt={`Local de ${settings.store_name} en Garín`}
                  fill
                  priority
                  sizes="560px"
                  className="object-cover"
                />
              </div>
            ) : (
              <HeroPanel address={settings.address} />
            )}
          </div>
        </div>
      </section>

      {/* SECCIONES */}
      <nav aria-labelledby="secciones-titulo" className="container-page py-6 sm:py-12">
        <h2 id="secciones-titulo" className="sr-only">
          Secciones
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {sections.map(({ href, icon: Icon, title, text, featured }) => (
            <li key={href} className={featured ? "col-span-2 lg:col-span-1" : undefined}>
              <Link
                href={href}
                className={`group flex h-full flex-col rounded-[var(--radius-card)] border p-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:p-5 ${
                  featured ? "on-dark border-graphite bg-graphite text-white" : "border-line bg-white"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className={`grid size-10 place-items-center rounded-xl ${featured ? "bg-brand text-graphite" : "bg-graphite text-brand"}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <ArrowRight className={`size-5 transition-transform group-hover:translate-x-0.5 ${featured ? "text-brand" : "text-muted"}`} aria-hidden />
                </span>
                <span className="mt-4 text-[17px] font-semibold">{title}</span>
                <span className={`mt-0.5 text-[13px] leading-5 ${featured ? "text-white/70" : "text-muted"}`}>{text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* RUBROS (acceso rápido) */}
      {categories.length > 0 ? (
        <section aria-labelledby="rubros-titulo" className="container-page pb-10 sm:pb-16">
          <div className="flex items-center justify-between">
            <h2 id="rubros-titulo" className="text-lg font-semibold sm:text-xl">
              Rubros
            </h2>
            <Link href="/categorias" className="text-sm font-semibold text-brand-ink hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {categories.slice(0, 12).map((c) => (
              <li key={c.slug} className="shrink-0">
                <Link
                  href={`/catalogo?categoria=${encodeURIComponent(c.slug)}`}
                  className="inline-flex h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-carbon transition-colors hover:border-graphite/30"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** Panel ilustrativo del buscador (sin datos reales del catálogo). Sólo escritorio. */
function HeroPanel({ address }: { address: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-white/10 bg-carbon/80 p-6 shadow-2xl backdrop-blur" aria-hidden>
      <div className="grid gap-2.5">
        {[
          ["Código exacto", "primero en los resultados"],
          ["Sin acentos ni mayúsculas", "buscás como escribís"],
          ["Filtros por rubro y marca", "resultados ordenados"],
        ].map(([a, b]) => (
          <div key={a} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
            <span className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-brand/15 text-brand">
                <CircleCheck className="size-4" />
              </span>
              <span className="text-[15px] font-semibold text-white">{a}</span>
            </span>
            <span className="text-sm text-white/55">{b}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-brand px-4 py-3.5 text-graphite">
        <WhatsAppIcon className="size-5" />
        <span className="text-[15px] font-semibold">Lista de consulta → WhatsApp</span>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm text-white/55">
        <MapPin className="size-4" /> {address}
      </p>
    </div>
  );
}
