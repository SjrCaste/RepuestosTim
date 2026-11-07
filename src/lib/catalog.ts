import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 24;
export const SORTS = [
  { value: "relevance", label: "Relevancia" },
  { value: "name_asc", label: "Nombre (A-Z)" },
  { value: "name_desc", label: "Nombre (Z-A)" },
  { value: "price_asc", label: "Precio: menor a mayor", needsPrice: true },
  { value: "price_desc", label: "Precio: mayor a menor", needsPrice: true },
] as const;

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  brand_name: string | null;
  brand_slug: string | null;
  category_name: string | null;
  category_slug: string | null;
  sale_price_ars: number | null;
  stock_status: string;
  image_path: string | null;
  image_url: string | null;
}

export interface ProductDetail extends CatalogItem {
  description: string | null;
  compatibility: string | null;
  specs: Record<string, string>;
  in_list_quantity: number | null;
}

export interface Facets {
  categories: { slug: string; name: string; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  prices_visible: boolean;
}

export class CatalogRateLimitError extends Error {
  constructor() {
    super("Hiciste muchas búsquedas seguidas. Esperá un minuto y volvé a intentar.");
  }
}

type PgError = { code?: string; message: string } | null;

function handle(error: PgError): void {
  if (!error) return;
  if (error.code === "42501" || /not_authorized/.test(error.message)) redirect("/cuenta");
  if (error.code === "PT429" || /rate_limited/.test(error.message)) throw new CatalogRateLimitError();
  throw new Error(`Error del catálogo: ${error.message}`);
}

/** URLs firmadas de corta duración para imágenes privadas (bucket product-images). */
export async function signImages(paths: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean) as string[])];
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("product-images").createSignedUrls(unique, 60 * 60);
  for (const d of data ?? []) if (d.path && d.signedUrl && !d.error) map.set(d.path, d.signedUrl);
  return map;
}

export async function searchCatalog(params: {
  q?: string;
  categoria?: string;
  marca?: string;
  orden?: string;
  pagina?: number;
}): Promise<{ items: CatalogItem[]; total: number; page: number; pageSize: number }> {
  const supabase = await createClient();
  const page = Math.max(1, Math.min(1000, Math.floor(params.pagina ?? 1)));
  const { data, error } = await supabase.rpc("catalog_search", {
    p_query: params.q?.slice(0, 120) || null,
    p_category: params.categoria || null,
    p_brand: params.marca || null,
    p_sort: params.orden || "relevance",
    p_page: page,
    p_page_size: PAGE_SIZE,
  });
  handle(error);
  const rows = (data ?? []) as (Omit<CatalogItem, "image_url"> & { total_count: number })[];
  const urls = await signImages(rows.map((r) => r.image_path));
  return {
    items: rows.map(({ total_count: _t, ...r }) => ({ ...r, image_url: r.image_path ? (urls.get(r.image_path) ?? null) : null })),
    total: rows.length ? Number(rows[0].total_count) : 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getProduct(sku: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalog_product", { p_sku: sku.slice(0, 64) });
  handle(error);
  const row = (data as Omit<ProductDetail, "image_url">[] | null)?.[0];
  if (!row) return null;
  const urls = await signImages([row.image_path]);
  return { ...row, specs: (row.specs ?? {}) as Record<string, string>, image_url: row.image_path ? (urls.get(row.image_path) ?? null) : null };
}

export async function getFacets(): Promise<Facets> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalog_facets");
  handle(error);
  return (data as Facets) ?? { categories: [], brands: [], prices_visible: false };
}

export interface ListItem {
  product_id: string;
  sku: string;
  name: string;
  brand_name: string | null;
  image_path: string | null;
  image_url: string | null;
  quantity: number;
  sale_price_ars: number | null;
  available: boolean;
}

export async function getInquiryList(): Promise<ListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inquiry_list_get");
  handle(error);
  const rows = (data ?? []) as Omit<ListItem, "image_url">[];
  const urls = await signImages(rows.map((r) => r.image_path));
  return rows.map((r) => ({ ...r, image_url: r.image_path ? (urls.get(r.image_path) ?? null) : null }));
}

export async function getListCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase.from("inquiry_list_items").select("product_id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}
