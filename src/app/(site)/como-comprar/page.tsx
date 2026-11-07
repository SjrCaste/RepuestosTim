import type { Metadata } from "next";
import { UserPlus, MailCheck, Search, ListPlus, Send, CircleCheck } from "lucide-react";
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
  return (
    <>
      <PageHero eyebrow="Cómo comprar" title="Consultar un repuesto es simple">
        No hay checkout online: armás tu consulta en el catálogo y la confirmamos con vos por WhatsApp.
      </PageHero>
      <section className="container-page py-14">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-[var(--radius-card)] border border-line bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-graphite text-brand">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-muted">Paso {i + 1}</span>
              </div>
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-[15px] leading-6 text-muted">{text}</p>
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
    </>
  );
}
