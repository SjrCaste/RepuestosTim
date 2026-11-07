import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { signImages } from "@/lib/catalog";
import { PageHeader } from "@/components/ui/feedback";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageUploader } from "@/components/admin/product-image-uploader";
import { formatDate } from "@/lib/format";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, { data: cost }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("admin_get_product_cost", { p_product_id: id }),
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  if (!p) notFound();
  const urls = await signImages([p.image_path]);

  return (
    <div className="grid gap-5">
      <Link href="/admin/productos" className="inline-flex items-center gap-1 text-sm font-semibold text-carbon hover:text-brand-ink">
        <ChevronLeft className="size-4" aria-hidden /> Productos
      </Link>
      <PageHeader
        title={<span className="font-mono">{p.sku}</span>}
        description={`Actualizado ${formatDate(p.updated_at)}`}
        actions={
          p.active ? (
            <Link href={`/catalogo/${encodeURIComponent(p.sku)}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:underline">
              Ver en catálogo <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : null
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_300px] xl:items-start">
        <ProductForm
          created={sp.creado === "1"}
          product={{
            ...p,
            cost_price_ars: (cost as number | null) ?? null,
            compatibility_verified: Boolean(p.compatibility_verified_at),
          }}
          brands={brands ?? []}
          categories={categories ?? []}
        />
        <div className="rounded-[var(--radius-card)] border border-line bg-white p-4 xl:sticky xl:top-24">
          <h2 className="mb-3 font-semibold">Imagen</h2>
          <ProductImageUploader productId={p.id} sku={p.sku} imageUrl={p.image_path ? (urls.get(p.image_path) ?? null) : null} />
        </div>
      </div>
    </div>
  );
}
