import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/feedback";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  return (
    <div className="grid gap-5">
      <Link href="/admin/productos" className="inline-flex items-center gap-1 text-sm font-semibold text-carbon hover:text-brand-ink">
        <ChevronLeft className="size-4" aria-hidden /> Productos
      </Link>
      <PageHeader title="Nuevo producto" description="La imagen se puede subir después de crear el producto." />
      <ProductForm product={{ active: true, stock_status: "unknown" }} brands={brands ?? []} categories={categories ?? []} />
    </div>
  );
}
