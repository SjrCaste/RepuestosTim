import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { ProductsTable, type AdminProductRow } from "@/components/admin/products-table";
import { normalizeSearch } from "@/lib/import/normalize";

const PAGE = 50;

export default async function AdminProductos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 120);
  const estado = sp.estado ?? "";
  const categoria = sp.categoria ?? "";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("id, sku, name, active, sale_price_ars, stock_status, image_path, updated_at, brands(name), categories(name)", { count: "exact" })
    .order("sku")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) {
    const tokens = normalizeSearch(q).split(" ").filter(Boolean).slice(0, 6);
    for (const t of tokens) query = query.ilike("search_text", `%${t.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
  }
  if (estado === "activos") query = query.eq("active", true);
  if (estado === "inactivos") query = query.eq("active", false);
  if (estado === "sin-imagen") query = query.is("image_path", null);
  if (estado === "sin-precio") query = query.is("sale_price_ars", null);
  if (categoria) query = query.eq("category_id", categoria);

  const [{ data, count, error }, { data: cats }] = await Promise.all([query, supabase.from("categories").select("id, name").order("name")]);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (estado) u.set("estado", estado);
    if (categoria) u.set("categoria", categoria);
    if (p > 1) u.set("pagina", String(p));
    return `/admin/productos${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Productos"
        description={`${total} producto(s) con estos filtros.`}
        actions={
          <ButtonLink href="/admin/productos/nuevo">
            <Plus aria-hidden /> Nuevo producto
          </ButtonLink>
        }
      />
      <form method="get" className="grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-[1fr_200px_200px_auto]">
        <div className="relative">
          <label htmlFor="aq" className="sr-only">
            Buscar
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="aq" name="q" defaultValue={q} placeholder="SKU, nombre, marca…" className="h-11 w-full rounded-lg border border-line pl-9 pr-3 focus:border-brand-ink focus:outline-none focus:ring-3 focus:ring-brand/30" />
        </div>
        <label className="sr-only" htmlFor="ae">
          Estado
        </label>
        <Select id="ae" name="estado" defaultValue={estado}>
          <option value="">Todos</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="sin-imagen">Sin imagen</option>
          <option value="sin-precio">Sin precio</option>
        </Select>
        <label className="sr-only" htmlFor="ac">
          Categoría
        </label>
        <Select id="ac" name="categoria" defaultValue={categoria}>
          <option value="">Todas las categorías</option>
          {(cats ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <button type="submit" className="h-11 rounded-lg bg-graphite px-5 font-semibold text-white hover:bg-carbon">
          Filtrar
        </button>
      </form>
      {error ? <p className="text-danger">Error: {error.message}</p> : null}
      <ProductsTable rows={(data ?? []) as unknown as AdminProductRow[]} />
      {pages > 1 ? (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 ? <Link className="font-semibold text-brand-ink underline" href={href(page - 1)}>Anterior</Link> : null}
          <span className="text-muted">
            Página {page} de {pages}
          </span>
          {page < pages ? <Link className="font-semibold text-brand-ink underline" href={href(page + 1)}>Siguiente</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
