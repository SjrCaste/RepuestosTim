"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X, LoaderCircle } from "lucide-react";
import { Select } from "@/components/ui/form";
import type { Facets } from "@/lib/catalog";

interface Sort {
  value: string;
  label: string;
  needsPrice?: boolean;
}

/**
 * Buscador + filtros combinables. Funciona sin JavaScript (form GET); con JS
 * aplica los filtros al cambiar un select y muestra estado de carga.
 */
export function CatalogFilters({ facets, sorts }: { facets: Facets; sorts: readonly Sort[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const q = sp.get("q") ?? "";
  const categoria = sp.get("categoria") ?? "";
  const marca = sp.get("marca") ?? "";
  const orden = sp.get("orden") ?? "relevance";
  const hasFilters = Boolean(q || categoria || marca);

  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of fd.entries()) {
      const s = String(v).trim();
      if (s && !(k === "orden" && s === "relevance")) params.set(k, s);
    }
    start(() => router.push(`/catalogo${params.size ? `?${params}` : ""}`));
  };

  return (
    <form
      action="/catalogo"
      method="get"
      role="search"
      aria-label="Buscar en el catálogo"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
      className="grid gap-3"
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="catalog-q" className="sr-only">
            Buscar por código, nombre, marca o rubro
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="catalog-q"
            key={q}
            name="q"
            type="search"
            defaultValue={q}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Código (SKU), nombre, marca o rubro"
            className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-base placeholder:text-muted/80 focus:border-brand-ink focus:outline-none focus:ring-3 focus:ring-brand/30"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-xl bg-graphite px-4 font-semibold text-white hover:bg-carbon sm:px-6"
        >
          {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Search className="size-5 sm:hidden" aria-hidden />}
          <span className="sr-only sm:not-sr-only">Buscar</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="f-cat" className="sr-only">
            Categoría
          </label>
          <Select id="f-cat" name="categoria" key={`c-${categoria}`} defaultValue={categoria} onChange={(e) => submit(e.currentTarget.form!)}>
            <option value="">Todas las categorías</option>
            {facets.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.count})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-brand" className="sr-only">
            Marca
          </label>
          <Select id="f-brand" name="marca" key={`b-${marca}`} defaultValue={marca} onChange={(e) => submit(e.currentTarget.form!)}>
            <option value="">Todas las marcas</option>
            {facets.brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} ({b.count})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-sort" className="sr-only">
            Ordenar
          </label>
          <Select id="f-sort" name="orden" key={`o-${orden}`} defaultValue={orden} onChange={(e) => submit(e.currentTarget.form!)}>
            {sorts
              .filter((s) => !s.needsPrice || facets.prices_visible)
              .map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
          </Select>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => start(() => router.push("/catalogo"))}
            className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-carbon hover:bg-graphite/5 sm:col-span-1"
          >
            <X className="size-4" aria-hidden /> Limpiar
          </button>
        ) : null}
      </div>
      <noscript>
        <button type="submit" className="h-11 rounded-lg border border-line bg-white px-4 font-semibold">
          Aplicar filtros
        </button>
      </noscript>
    </form>
  );
}
