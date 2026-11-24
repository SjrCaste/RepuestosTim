import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BadgeCheck, Info } from "lucide-react";
import { ProductImage } from "@/components/catalog/product-image";
import { AddToList } from "@/components/catalog/add-to-list";
import { Badge, Alert } from "@/components/ui/feedback";
import { ButtonA } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { requireCatalogAccess } from "@/lib/auth/access";
import { CatalogRateLimitError, getFacets, getProduct } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { STOCK_LABELS, formatARS } from "@/lib/format";
import { buildInquiryMessage, whatsappUrl } from "@/lib/whatsapp";

// Nunca se genera estáticamente (sin generateStaticParams): ficha privada.
export const metadata: Metadata = { title: "Ficha de producto", robots: { index: false, follow: false } };

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku: rawSku } = await params;
  const sku = decodeURIComponent(rawSku).slice(0, 64);
  const access = await requireCatalogAccess(`/catalogo/${encodeURIComponent(sku)}`);

  let product, facets;
  try {
    [product, facets] = await Promise.all([getProduct(sku), getFacets()]);
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
  if (!product) notFound();

  const settings = await getSettings();
  const stock = STOCK_LABELS[product.stock_status];
  const price = facets.prices_visible ? formatARS(product.sale_price_ars) : null;
  const specs = Object.entries(product.specs ?? {}).filter(([, v]) => v !== null && String(v).trim() !== "");
  const waMessage = buildInquiryMessage({
    items: [{ sku: product.sku, name: product.name, brand: product.brand_name, quantity: 1 }],
    customerName: access.full_name,
    storeName: settings.store_name,
  });

  return (
    <div className="container-page py-6 sm:py-8">
      <Link href="/catalogo" className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-carbon hover:text-brand-ink">
        <ChevronLeft className="size-4" aria-hidden /> Volver al catálogo
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            category={product.category_name}
            sku={product.sku}
            className="aspect-square w-full"
            priority
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-graphite px-2.5 py-1 font-mono text-sm font-semibold tracking-wide text-white">SKU {product.sku}</span>
            {product.brand_name ? <Badge>{product.brand_name}</Badge> : null}
            {stock ? <Badge tone={stock.tone}>{stock.label}</Badge> : null}
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              Mayorista & Minorista
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold leading-tight [overflow-wrap:anywhere] sm:text-3xl">{product.name}</h1>
          {product.category_name ? (
            <p className="mt-2 text-[15px] text-muted">
              Categoría:{" "}
              <Link href={`/catalogo?categoria=${product.category_slug}`} className="font-semibold text-brand-ink hover:underline">
                {product.category_name}
              </Link>
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Venta Mayorista y Minorista
              </span>
              <span className="text-xs text-muted">Envíos a todo el país · Factura A y B</span>
            </div>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.1em] text-muted">Cotización</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-carbon sm:text-3xl">
              {price ?? <span className="text-xl text-brand-ink">Consultar precio</span>}
            </p>
            <p className="mt-1 text-[13px] text-muted">Precio por cantidad y por unidad. Disponibilidad confirmada al instante.</p>
            <div className="mt-5">
              <AddToList productId={product.id} productName={product.name} initialInList={product.in_list_quantity} />
            </div>
            <ButtonA href={whatsappUrl(settings.whatsapp_number, waMessage)} target="_blank" rel="noopener noreferrer" variant="outline" className="mt-2 w-full sm:w-auto">
              <WhatsAppIcon /> Consultar sólo este producto
            </ButtonA>
          </div>

          {product.description ? (
            <section className="mt-8" aria-labelledby="desc">
              <h2 id="desc" className="text-lg font-semibold">
                Descripción
              </h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-carbon">{product.description}</p>
            </section>
          ) : null}

          {specs.length > 0 ? (
            <section className="mt-8" aria-labelledby="specs">
              <h2 id="specs" className="text-lg font-semibold">
                Especificaciones
              </h2>
              <dl className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[40%_1fr] gap-3 px-4 py-2.5 text-[15px]">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="mt-8" aria-labelledby="compat">
            <h2 id="compat" className="text-lg font-semibold">
              Compatibilidad
            </h2>
            {product.compatibility ? (
              <div className="mt-3 rounded-xl border border-brand-ink/25 bg-brand-soft p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                  <BadgeCheck className="size-5" aria-hidden /> Verificada por el local
                </p>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-carbon">{product.compatibility}</p>
              </div>
            ) : (
              <p className="mt-2 flex gap-2 text-[15px] leading-7 text-muted">
                <Info className="mt-1 size-5 shrink-0" aria-hidden />
                Consultanos con marca, modelo, año y motor de tu vehículo y confirmamos si este repuesto corresponde.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
