import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui/feedback";
import { TaxonomyForm, type TaxonomyRow } from "@/components/admin/taxonomy-form";

export const metadata = { title: "Rubros y marcas" };

export default async function RubrosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: cats }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("id, name, slug, description, sort_order, active, public_visible, source_name, products(count)").order("sort_order").order("name"),
    supabase.from("brands").select("id, name, slug, active, products(count)").order("name"),
  ]);
  const withCount = (rows: unknown[] | null) =>
    ((rows ?? []) as (TaxonomyRow & { products: { count: number }[] })[]).map(({ products, ...r }) => ({ ...r, product_count: products?.[0]?.count ?? 0 }));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Rubros y marcas"
        description="Los rubros activos y marcados como visibles aparecen en la home pública (sólo el nombre). Desactivar un rubro o marca oculta sus productos del catálogo."
      />
      <Card className="p-5">
        <h2 className="font-semibold">Rubros</h2>
        <div className="mt-2 divide-y divide-line">
          {withCount(cats).map((c) => (
            <TaxonomyForm key={c.id} table="categories" row={c} />
          ))}
          <TaxonomyForm table="categories" row={{}} />
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Marcas</h2>
        <div className="mt-2 divide-y divide-line">
          {withCount(brands).map((b) => (
            <TaxonomyForm key={b.id} table="brands" row={b} />
          ))}
          <TaxonomyForm table="brands" row={{}} />
        </div>
      </Card>
    </div>
  );
}
