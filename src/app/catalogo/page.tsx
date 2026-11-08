import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { CatalogFilters } from "@/components/catalog/filters";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState, Alert } from "@/components/ui/feedback";
import { ButtonA, ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { requireCatalogAccess } from "@/lib/auth/access";
import { CatalogRateLimitError, SORTS, getFacets, searchCatalog } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Catálogo" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CatalogoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = {
    q: one(sp.q).trim().slice(0, 120),
    categoria: one(sp.categoria).slice(0, 80),
    marca: one(sp.marca).slice(0, 80),
    orden: one(sp.orden) || "relevance",
    pagina: Number(one(sp.pagina)) || 1,
  };
  await requireCatalogAccess(`/catalogo`);
  const settings = await getSettings();

  let facets, result;
  try {
    [facets, result] = await Promise.all([getFacets(), searchCatalog(params)]);
  } catch (e) {
    if (e instanceof CatalogRateLimitError) {
      return (
        <div className="container-page py-10">
          <Alert tone="warn" title="Esperá un momento" live>
            {e.message}
          </Alert>
        </div>
      );
    }
    throw e;
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    if (params.q) u.set("q", params.q);
    if (params.categoria) u.set("categoria", params.categoria);
    if (params.marca) u.set("marca", params.marca);
    if (params.orden !== "relevance") u.set("orden", params.orden);
    if (p > 1) u.set("pagina", String(p));
    return `/catalogo${u.size ? `?${u}` : ""}`;
  };
  const catName = facets.categories.find((c) => c.slug === params.categoria)?.name;
  const from = (result.page - 1) * result.pageSize + 1;
  const to = from + result.items.length - 1;

  return (
    <div className="container-page py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{catName ?? "Catálogo de repuestos"}</h1>
          <p className="mt-1 text-[15px] text-muted">
            {facets.prices_visible ? "Precios orientativos: confirmá disponibilidad con el local." : "Agregá productos a tu lista y consultá precio y disponibilidad por WhatsApp."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-3 shadow-[var(--shadow-card)] sm:p-4">
        <Suspense>
          <CatalogFilters facets={facets} sorts={SORTS} />
        </Suspense>
      </div>

      <p className="mt-5 text-sm text-muted" role="status" aria-live="polite">
        {result.total > 0 ? (
          <>
            Mostrando <strong className="text-graphite">{from}–{to}</strong> de <strong className="text-graphite">{result.total}</strong> productos
            {params.q ? (
              <>
                {" "}
                para “<strong className="text-graphite">{params.q}</strong>”
              </>
            ) : null}
          </>
        ) : (
          "Sin resultados"
        )}
      </p>

      {result.items.length > 0 ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((item) => (
            <li key={item.id} className="flex min-w-0">
              <div className="flex w-full min-w-0 [&>article]:w-full [&>article]:min-w-0">
                <ProductCard item={item} pricesVisible={facets.prices_visible} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-4"
          icon={<PackageSearch />}
          title={params.q ? `No encontramos “${params.q}”` : "No hay productos para estos filtros"}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              {params.q || params.categoria || params.marca ? (
                <ButtonLink href="/catalogo" variant="outline">
                  Ver todo el catálogo
                </ButtonLink>
              ) : null}
              <ButtonA
                href={whatsappUrl(settings.whatsapp_number, `Hola, busco un repuesto${params.q ? `: ${params.q}` : ""}. ¿Lo tienen?`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon /> Consultar por WhatsApp
              </ButtonA>
            </div>
          }
        >
          Probá con otro código o palabra, revisá los filtros, o consultanos directamente: puede que lo tengamos aunque no figure acá.
        </EmptyState>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Paginación" className="mt-8 flex items-center justify-center gap-2">
          {result.page > 1 ? (
            <ButtonLink href={pageHref(result.page - 1)} variant="outline" size="sm" rel="prev">
              <ChevronLeft aria-hidden /> Anterior
            </ButtonLink>
          ) : null}
          <span className="px-3 text-sm text-muted">
            Página <strong className="text-graphite">{result.page}</strong> de {totalPages}
          </span>
          {result.page < totalPages ? (
            <ButtonLink href={pageHref(result.page + 1)} variant="outline" size="sm" rel="next">
              Siguiente <ChevronRight aria-hidden />
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}

      <p className="mt-10 text-center text-[13px] text-muted">
        ¿No encontrás lo que buscás? <Link href="/catalogo/lista" className="font-semibold text-brand-ink underline">Revisá tu lista</Link> o escribinos por WhatsApp.
      </p>
    </div>
  );
}
