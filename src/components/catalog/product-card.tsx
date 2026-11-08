import Link from "next/link";
import { ProductImage } from "./product-image";
import { AddToList } from "./add-to-list";
import { Badge } from "@/components/ui/feedback";
import { STOCK_LABELS, formatARS } from "@/lib/format";
import type { CatalogItem } from "@/lib/catalog";

export function ProductCard({ item, pricesVisible }: { item: CatalogItem; pricesVisible: boolean }) {
  const stock = STOCK_LABELS[item.stock_status];
  const price = pricesVisible ? formatARS(item.sale_price_ars) : null;
  const href = `/catalogo/${encodeURIComponent(item.sku)}`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-shadow hover:shadow-[var(--shadow-lift)]">
      <Link href={href} className="block border-b border-line" tabIndex={-1} aria-hidden>
        <ProductImage src={item.image_url} alt="" className="aspect-[4/3] w-full" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-graphite px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white">{item.sku}</span>
          {item.brand_name ? <Badge>{item.brand_name}</Badge> : null}
          {stock ? <Badge tone={stock.tone}>{stock.label}</Badge> : null}
        </div>
        <h3 className="mt-3 line-clamp-3 text-[15px] font-semibold leading-snug [overflow-wrap:anywhere]">
          <Link href={href} className="hover:text-brand-ink hover:underline">
            {item.name}
          </Link>
        </h3>
        {item.category_name ? <p className="mt-1 text-[13px] text-muted">{item.category_name}</p> : null}
        <div className="mt-auto pt-4">
          <p className="mb-3 text-lg font-semibold tabular-nums">
            {price ?? <span className="text-[15px] font-semibold text-muted">Consultar precio</span>}
          </p>
          <AddToList productId={item.id} productName={item.name} compact />
        </div>
      </div>
    </article>
  );
}
