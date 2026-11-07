import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getPublicCategories } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Categorías de repuestos",
  description: "Rubros de repuestos disponibles en TIM REPUESTOS, Garín. El detalle de cada producto está en el catálogo para clientes.",
  alternates: { canonical: "/categorias" },
};

export default async function CategoriasPage() {
  const categories = await getPublicCategories();
  return (
    <>
      <PageHero eyebrow="Categorías" title="Rubros de repuestos">
        Una vista general de las familias de productos. Para ver códigos, fichas y consultar disponibilidad, ingresá al catálogo con tu cuenta.
      </PageHero>
      <section className="container-page py-14">
        {categories.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/catalogo?categoria=${encodeURIComponent(c.slug)}`}
                  className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-white p-6 transition-shadow hover:shadow-[var(--shadow-lift)]"
                >
                  <span aria-hidden className="h-1 w-10 rounded-full bg-brand" />
                  <h2 className="mt-5 text-xl font-semibold">{c.name}</h2>
                  {c.description ? <p className="mt-2 text-[15px] leading-6 text-muted">{c.description}</p> : null}
                  <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-brand-ink">
                    <Lock className="size-4" aria-hidden /> Ver en el catálogo
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white p-8 text-center">
            <h2 className="text-lg font-semibold">Estamos cargando los rubros</h2>
            <p className="mt-2 text-muted">Mientras tanto, consultanos por WhatsApp por el repuesto que necesitás.</p>
          </div>
        )}
        <div className="mt-12 flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-carbon">¿Todavía no tenés cuenta? Registrate gratis para acceder al catálogo.</p>
          <ButtonLink href="/registro">Crear cuenta</ButtonLink>
        </div>
      </section>
    </>
  );
}
