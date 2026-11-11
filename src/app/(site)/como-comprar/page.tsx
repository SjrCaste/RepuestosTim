import type { Metadata } from "next";
import { UserPlus, MailCheck, Search, ListPlus, Send, CircleCheck, ChevronDown } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Cómo comprar",
  description: "Cómo consultar repuestos en TIM REPUESTOS: creá tu cuenta, buscá en el catálogo y enviá tu consulta por WhatsApp.",
  alternates: { canonical: "/como-comprar" },
};

export default async function ComoComprarPage() {
  const settings = await getSettings();
  const steps = [
    { icon: UserPlus, title: "Creá tu cuenta", text: "Completá nombre, email y una contraseña segura. El teléfono es opcional." },
    {
      icon: MailCheck,
      title: "Confirmá tu email",
      text: settings.requires_approval
        ? "Abrí el enlace que te enviamos por correo. Después el local aprueba tu cuenta para habilitar el catálogo."
        : "Abrí el enlace que te enviamos por correo y tu cuenta queda habilitada.",
    },
    { icon: Search, title: "Buscá el repuesto", text: "Por código (SKU), nombre, marca o rubro. Podés filtrar y ordenar los resultados." },
    { icon: ListPlus, title: "Armá tu lista", text: "Agregá uno o varios productos con la cantidad que necesitás. La lista queda guardada en tu cuenta." },
    { icon: Send, title: "Enviá la consulta", text: "Con un clic se abre WhatsApp con el detalle: códigos, nombres y cantidades." },
    {
      icon: CircleCheck,
      title: "Confirmá con el local",
      text: "Te respondemos con disponibilidad y precio. Por ahora no hay pagos online: la compra se coordina con el local.",
    },
  ];
  const faqs = [
    {
      q: "¿Cómo veo el catálogo?",
      a: `Creá una cuenta gratuita con tu email y confirmala desde el enlace que te llega por correo.${
        settings.requires_approval ? " Después, el local revisa y aprueba tu cuenta; te avisamos cuando esté habilitada." : ""
      }`,
    },
    {
      q: "¿Los precios y el stock están actualizados?",
      a: `El precio y la disponibilidad se confirman siempre por WhatsApp antes de cada compra.${
        settings.prices_visible_to_customers ? "" : " Por el momento, los precios se informan por consulta."
      }`,
    },
    {
      q: "¿Puedo consultar por mi vehículo?",
      a: "Sí. Contanos marca, modelo, año y motor, y si podés, el código de la pieza o una foto. La compatibilidad la confirma el local en cada consulta.",
    },
    {
      q: "¿Dónde están?",
      a: `En ${settings.address}.${settings.business_hours ? ` Horarios: ${settings.business_hours}.` : " Consultá los horarios por WhatsApp."}`,
    },
  ];
  return (
    <>
      <PageHero eyebrow="Cómo comprar" title="Consultar un repuesto es simple">
        No hay checkout online: armás tu consulta en el catálogo y la confirmamos con vos por WhatsApp.
      </PageHero>
      <section className="container-page py-8 sm:py-14">
        <ol className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:block sm:p-6">
              <div className="flex shrink-0 items-center gap-3 self-start">
                <span className="grid size-10 place-items-center rounded-xl bg-graphite text-brand sm:size-11">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="hidden text-sm font-semibold text-muted sm:inline">Paso {i + 1}</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold sm:mt-5 sm:text-lg">
                  <span className="text-muted sm:hidden">{i + 1}. </span>
                  {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted sm:mt-2 sm:text-[15px]">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/registro" size="lg">
            Crear cuenta
          </ButtonLink>
          <ButtonLink href="/ingresar" variant="outline" size="lg">
            Ya tengo cuenta
          </ButtonLink>
        </div>
      </section>
      <section aria-labelledby="faq-titulo" className="container-page pb-16">
        <h2 id="faq-titulo" className="text-xl font-semibold sm:text-2xl">
          Preguntas frecuentes
        </h2>
        <div className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="-mt-1 pb-4 text-[15px] leading-7 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
