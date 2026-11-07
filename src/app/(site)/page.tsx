import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Search,
  MessageCircle,
  PackageSearch,
  Store,
  UserPlus,
  Send,
  CircleCheck,
  MapPin,
  ChevronDown,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { ButtonA, ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { getPublicCategories, getSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/whatsapp";
import { siteUrl } from "@/lib/env";

export const revalidate = 300;

export default async function HomePage() {
  const [settings, categories] = await Promise.all([getSettings(), getPublicCategories()]);
  const waGeneral = whatsappUrl(settings.whatsapp_number, "Hola TIM REPUESTOS, quiero consultar por un repuesto.");

  const benefits = [
    {
      icon: Hash,
      title: "Búsqueda por código",
      text: "Encontrá cada pieza por SKU, nombre, marca o rubro. Sin importar mayúsculas ni acentos.",
    },
    {
      icon: MessageCircle,
      title: "Atención directa",
      text: "Hablás con el local. Te ayudamos a identificar el repuesto correcto para tu vehículo.",
    },
    {
      icon: PackageSearch,
      title: "Consulta de disponibilidad",
      text: "Armá tu lista con cantidades y envianos la consulta por WhatsApp en un solo paso.",
    },
    ...(settings.pickup_confirmed
      ? [{ icon: Store, title: "Retiro en Garín", text: `Retirás en el local: ${settings.address.split(",").slice(0, 2).join(",")}.` }]
      : []),
  ];

  const steps = [
    { icon: UserPlus, title: "Creá tu cuenta", text: "Registrate con tu email y confirmalo desde el correo que te enviamos." },
    { icon: Search, title: "Encontrá la pieza", text: "Buscá por código, nombre, marca o categoría y revisá la ficha." },
    { icon: Send, title: "Enviá la consulta", text: "Sumá productos y cantidades a tu lista y mandala por WhatsApp." },
    { icon: CircleCheck, title: "Confirmá con el local", text: "Te respondemos con disponibilidad y precio antes de comprar." },
  ];

  const faqs = [
    {
      q: "¿Cómo veo el catálogo?",
      a: `Creá una cuenta gratuita con tu email y confirmala desde el enlace que te llega por correo.${
        settings.requires_approval ? " Después, el local revisa y aprueba tu cuenta; te avisamos cuando esté habilitada." : ""
      } Con la sesión iniciada vas a poder buscar y ver las fichas de los productos.`,
    },
    {
      q: "¿Cómo consulto por un repuesto?",
      a: "Dentro del catálogo agregás los productos y las cantidades a tu lista de consulta y la enviás por WhatsApp con un clic. También podés escribirnos directamente por WhatsApp.",
    },
    {
      q: "¿Los precios y el stock están actualizados?",
      a: `El catálogo se actualiza con las listas que carga el local, pero el precio y la disponibilidad se confirman siempre por WhatsApp antes de cada compra.${
        settings.prices_visible_to_customers ? "" : " Por el momento, los precios se informan por consulta."
      }`,
    },
    {
      q: "¿Dónde están?",
      a: `Estamos en ${settings.address}.${settings.business_hours ? ` Horarios: ${settings.business_hours}.` : " Consultá los horarios de atención por WhatsApp."}`,
    },
    {
      q: "¿Puedo consultar por mi vehículo?",
      a: "Sí. Contanos marca, modelo, año y motor, y si podés, el código de la pieza o una foto. Te ayudamos a identificar el repuesto. La compatibilidad la confirma el local en cada consulta.",
    },
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

      {/* HERO */}
      <section className="on-dark relative overflow-hidden bg-graphite text-white">
        <div className="tech-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_20%,black_20%,transparent_75%)]" aria-hidden />
        <div aria-hidden className="absolute -right-32 -top-40 size-[520px] rounded-full bg-brand/10 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow">
              <span className="h-px w-6 bg-brand" aria-hidden /> Casa de repuestos · Garín, Buenos Aires
            </p>
            <h1 className="mt-5 text-[2.35rem] font-semibold leading-[1.05] sm:text-5xl lg:text-[3.6rem]">
              El repuesto que necesitás. <span className="text-brand">Más fácil de encontrar.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/80">
              Repuestos para tu vehículo, atención personalizada y un catálogo pensado para encontrar cada pieza sin vueltas.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/catalogo" size="lg">
                Ingresar al catálogo <ArrowRight aria-hidden />
              </ButtonLink>
              <ButtonA href={waGeneral} target="_blank" rel="noopener noreferrer" variant="outline-dark" size="lg">
                <WhatsAppIcon /> Consultar por WhatsApp
              </ButtonA>
            </div>
            <p className="mt-8 flex items-center gap-2.5 text-[15px] text-white/75">
              <ShieldCheck className="size-5 text-brand" aria-hidden />
              Te ayudamos a identificar el repuesto correcto.
            </p>
          </div>

          <div className="relative">
            {settings.hero_image_url ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/10">
                <Image
                  src={settings.hero_image_url}
                  alt={`Local de ${settings.store_name} en Garín`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <HeroPanel address={settings.address} />
            )}
          </div>
        </div>
      </section>

      {/* BUSCADOR TEASER */}
      <section aria-labelledby="buscar-titulo" className="relative z-10 -mt-px border-b border-line bg-white">
        <div className="container-page py-8 sm:py-10">
          <form action="/catalogo" method="get" role="search" className="grid gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6">
            <h2 id="buscar-titulo" className="text-lg font-semibold lg:text-xl">
              ¿Qué repuesto buscás?
            </h2>
            <div className="relative">
              <label htmlFor="home-q" className="sr-only">
                Código, nombre o marca del repuesto
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="home-q"
                name="q"
                type="search"
                maxLength={120}
                autoComplete="off"
                placeholder="Código, nombre o marca del repuesto"
                className="h-13 w-full rounded-xl border border-line bg-paper pl-12 pr-4 text-base text-graphite placeholder:text-muted/80 focus:border-brand-ink focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand/30"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-graphite px-6 font-semibold text-white transition-colors hover:bg-carbon"
            >
              Buscar <ArrowRight className="size-5" aria-hidden />
            </button>
          </form>
          <p className="mt-3 text-sm text-muted">
            Los resultados se muestran a clientes registrados. Si no iniciaste sesión, te pedimos ingresar y retomamos tu búsqueda.
          </p>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section aria-labelledby="beneficios-titulo" className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Por qué TIM REPUESTOS</p>
          <h2 id="beneficios-titulo" className="mt-3 text-3xl font-semibold sm:text-4xl">
            Encontrar la pieza correcta, sin vueltas.
          </h2>
        </div>
        <ul className={`mt-10 grid gap-4 sm:grid-cols-2 ${benefits.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="group rounded-[var(--radius-card)] border border-line bg-white p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <span className="grid size-11 place-items-center rounded-xl bg-graphite text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* FAMILIAS */}
      <section aria-labelledby="familias-titulo" className="border-y border-line bg-white">
        <div className="container-page py-16 sm:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">Familias de productos</p>
              <h2 id="familias-titulo" className="mt-3 text-3xl font-semibold sm:text-4xl">
                Rubros disponibles
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-muted">
                Una vista general de los rubros. Los códigos, fichas y detalles están en el catálogo para clientes.
              </p>
            </div>
            <ButtonLink href="/categorias" variant="outline">
              Ver todas <ArrowRight aria-hidden />
            </ButtonLink>
          </div>
          {categories.length > 0 ? (
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.slice(0, 9).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/catalogo?categoria=${encodeURIComponent(c.slug)}`}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-paper px-5 py-4 transition-colors hover:border-graphite/30 hover:bg-white"
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden className="h-6 w-1 rounded-full bg-brand" />
                      <span className="font-semibold">{c.name}</span>
                    </span>
                    <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 rounded-xl border border-dashed border-line bg-paper px-5 py-6 text-[15px] text-muted">
              Estamos cargando los rubros del catálogo. Mientras tanto, consultanos por WhatsApp por cualquier repuesto.
            </p>
          )}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" aria-labelledby="como-titulo" className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow">Cómo funciona</p>
          <h2 id="como-titulo" className="mt-3 text-3xl font-semibold sm:text-4xl">
            De la búsqueda a la confirmación, en cuatro pasos.
          </h2>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-[var(--radius-card)] border border-line bg-white p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-ink">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-display text-3xl font-semibold text-graphite/12" aria-hidden>
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">
                <span className="sr-only">Paso {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-2 text-[15px] leading-6 text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* SOBRE */}
      <section aria-labelledby="sobre-titulo" className="on-dark bg-carbon text-white">
        <div className="container-page grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Sobre TIM REPUESTOS</p>
            <h2 id="sobre-titulo" className="mt-3 text-3xl font-semibold sm:text-4xl">
              Un local de repuestos en Garín, con atención directa.
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-8 text-white/80">
              Estamos en {settings.address}. Atendemos consultas en el local y por WhatsApp, y armamos este catálogo para que encuentres
              tus repuestos más rápido.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/nosotros" variant="outline-dark">
                Conocé el local
              </ButtonLink>
              {settings.maps_url ? (
                <ButtonA href={settings.maps_url} target="_blank" rel="noopener noreferrer" variant="ghost-dark">
                  <MapPin aria-hidden /> Cómo llegar
                </ButtonA>
              ) : null}
            </div>
          </div>
          {settings.about_image_url ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/10">
              <Image src={settings.about_image_url} alt={`Frente del local de ${settings.store_name}`} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" loading="lazy" />
            </div>
          ) : (
            <LocationCard address={settings.address} hours={settings.business_hours} mapsUrl={settings.maps_url} />
          )}
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-titulo" className="container-page py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2 id="faq-titulo" className="mt-3 text-3xl font-semibold sm:text-4xl">
              Lo que más nos consultan
            </h2>
          </div>
          <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="-mt-1 pb-5 text-[15px] leading-7 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="container-page pb-20">
        <div className="on-dark relative overflow-hidden rounded-3xl bg-graphite px-6 py-12 text-white sm:px-12 sm:py-14">
          <div className="tech-grid absolute inset-0 opacity-70" aria-hidden />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold sm:text-4xl">¿Buscás un repuesto?</h2>
              <p className="mt-3 text-[17px] leading-7 text-white/80">Creá tu cuenta para ver el catálogo o escribinos y te ayudamos a encontrarlo.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/registro" size="lg">
                Crear cuenta
              </ButtonLink>
              <ButtonA href={waGeneral} target="_blank" rel="noopener noreferrer" variant="outline-dark" size="lg">
                <WhatsAppIcon /> Escribir por WhatsApp
              </ButtonA>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Panel ilustrativo del buscador (sin datos reales del catálogo). */
function HeroPanel({ address }: { address: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-white/10 bg-carbon/80 p-5 shadow-2xl backdrop-blur sm:p-6" aria-hidden>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-graphite px-4 py-3.5">
        <Search className="size-5 text-brand" />
        <span className="text-[15px] text-white/60">Código, nombre o marca…</span>
        <span className="ml-auto rounded-md bg-brand px-2 py-1 text-xs font-bold text-graphite">Buscar</span>
      </div>
      <div className="mt-4 grid gap-2.5">
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
            <span className="hidden text-sm text-white/55 sm:inline">{b}</span>
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

function LocationCard({ address, hours, mapsUrl }: { address: string; hours: string | null; mapsUrl: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-graphite p-6 sm:p-8">
      <div className="tech-grid absolute inset-0" aria-hidden />
      <div className="relative">
        <span className="grid size-12 place-items-center rounded-xl bg-brand text-graphite">
          <MapPin className="size-6" aria-hidden />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.12em] text-brand">Dirección</p>
        <p className="mt-1 text-xl font-semibold">{address}</p>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-brand">Horarios</p>
        <p className="mt-1 whitespace-pre-line text-white/80">{hours ?? "Consultá los horarios por WhatsApp."}</p>
        {mapsUrl ? (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 font-semibold text-brand hover:underline">
            Abrir en Google Maps <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
