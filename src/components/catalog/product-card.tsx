import Link from "next/link";
import { ProductImage } from "./product-image";
import { AddToList } from "./add-to-list";
import { Badge } from "@/components/ui/feedback";
import { STOCK_LABELS, formatARS } from "@/lib/format";
import type { CatalogItem } from "@/lib/catalog";

function getQuickSpecs(name: string) {
  const upper = name.toUpperCase();
  const tags: string[] = [];

  if (upper.includes("DEL/DER") || upper.includes("DEL.DER")) tags.push("Delantero Derecho");
  else if (upper.includes("DEL/IZQ") || upper.includes("DEL.IZQ")) tags.push("Delantero Izquierdo");
  else if (upper.includes("TRAS/DER")) tags.push("Trasero Derecho");
  else if (upper.includes("TRAS/IZQ")) tags.push("Trasero Izquierdo");
  else if (upper.includes("TRAS.") || upper.includes("TRAS")) tags.push("Trasero");
  else if (upper.includes("DEL.") || upper.includes("DEL")) tags.push("Delantero");

  if (upper.includes("C/ROT")) tags.push("C/ Rótula");
  if (upper.includes("C/CRAP")) tags.push("C/ Crapodina");
  if (upper.includes("C/ABS")) tags.push("C/ ABS");
  if (upper.includes("C/RUL")) tags.push("C/ Rulemán");

  return tags;
}

export function ProductCard({ item, pricesVisible }: { item: CatalogItem; pricesVisible: boolean }) {
  const stock = STOCK_LABELS[item.stock_status];
  const price = pricesVisible ? formatARS(item.sale_price_ars) : null;
  const href = `/catalogo/${encodeURIComponent(item.sku)}`;
  const quickSpecs = getQuickSpecs(item.name);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-sm transition-all duration-200 hover:border-brand-primary/40 hover:shadow-[var(--shadow-lift)]">
      <Link href={href} className="block border-b border-line" tabIndex={-1} aria-hidden>
        <ProductImage
          src={item.image_url}
          alt={item.name}
          category={item.category_name}
          sku={item.sku}
          className="aspect-[4/3] w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {/* Barra superior con SKU, Marca y Stock */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-graphite px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white">
            {item.sku}
          </span>
          {item.brand_name ? <Badge>{item.brand_name}</Badge> : null}
          {stock ? <Badge tone={stock.tone}>{stock.label}</Badge> : null}
        </div>

        {/* Título del producto */}
        <h3 className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug text-carbon [overflow-wrap:anywhere] group-hover:text-brand-ink">
          <Link href={href} className="hover:underline">
            {item.name}
          </Link>
        </h3>

        {/* Categoría / Rubro */}
        {item.category_name ? (
          <p className="mt-1 text-xs font-medium text-muted">
            {item.category_name}
          </p>
        ) : null}

        {/* Características rápidas en chips */}
        {quickSpecs.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {quickSpecs.map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {/* Canal de venta y precio/consulta */}
        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-center justify-between border-t border-line/60 pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Canal
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Mayorista & Minorista
            </span>
          </div>

          <div className="mb-3">
            {price ? (
              <p className="text-lg font-semibold tabular-nums text-carbon">{price}</p>
            ) : (
              <p className="text-sm font-semibold text-brand-ink">
                Consultar cotización
              </p>
            )}
          </div>

          <AddToList productId={item.id} productName={item.name} compact />
        </div>
      </div>
    </article>
  );
}
