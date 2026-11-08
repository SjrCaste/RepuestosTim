import "server-only";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseImportFile } from "@/lib/import/parse";
import { suggestMapping } from "@/lib/import/mapping";
import { validateCatalog } from "@/lib/import/validate";
import { normalizeSearch, normalizeSkuKey, slugify } from "@/lib/import/normalize";

/**
 * MODO DEMOSTRACIÓN LOCAL (sólo desarrollo, sin Supabase).
 * Lee el archivo real de data/private/ (excluido de git) con el mismo
 * importador del panel admin. Nunca lee la columna de costo (el mapeo de
 * catálogo no la incluye) y nunca devuelve precios.
 */

export interface DemoProduct {
  id: string;
  sku: string;
  sku_norm: string;
  name: string;
  description: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  category_name: string | null;
  category_slug: string | null;
  search_text: string;
}

const CANDIDATES = ["tim_repuestos_catalogo_tochter.csv", "TOCHTER.xlsx", "TOCHTER.XLSX", "TOCHTER.XLS", "TOCHTER.xls"];

let cache: { file: string; mtime: number; products: DemoProduct[] } | null = null;

export function demoSourceFile(): string | null {
  const dir = path.join(process.cwd(), "data", "private");
  for (const name of CANDIDATES) {
    const p = path.join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

export function loadDemoProducts(): DemoProduct[] {
  const file = demoSourceFile();
  if (!file) return [];
  const mtime = statSync(file).mtimeMs;
  if (cache && cache.file === file && cache.mtime === mtime) return cache.products;

  const table = parseImportFile(readFileSync(file), path.basename(file));
  const report = validateCatalog(table, suggestMapping(table.headers, "catalog"));
  const products = report.valid
    .filter((r) => r.active)
    .map<DemoProduct>((r) => ({
      id: r.sku,
      sku: r.sku,
      sku_norm: normalizeSkuKey(r.sku),
      name: r.name,
      description: r.description,
      brand_name: r.brand,
      brand_slug: r.brand ? slugify(r.brand) : null,
      category_name: r.category,
      category_slug: r.category ? slugify(r.category) : null,
      search_text: normalizeSearch([r.sku, normalizeSkuKey(r.sku).toLowerCase(), r.name, r.description, r.brand, r.category].filter(Boolean).join(" ")),
    }));
  cache = { file, mtime, products };
  return products;
}

/** Misma lógica que la RPC catalog_search: SKU exacto primero, tokens sin acentos. */
export function demoSearch(params: { q?: string; categoria?: string; marca?: string; orden?: string; pagina: number; pageSize: number }) {
  const all = loadDemoProducts();
  const q = normalizeSearch(params.q ?? "").slice(0, 120);
  const qsku = normalizeSkuKey(params.q ?? "");
  const tokens = q.split(" ").filter(Boolean);
  let sort = params.orden ?? "relevance";
  if (!["relevance", "name_asc", "name_desc"].includes(sort)) sort = "relevance";
  if (!q && sort === "relevance") sort = "name_asc";

  const matched = all.filter(
    (p) =>
      (!params.categoria || p.category_slug === params.categoria) &&
      (!params.marca || p.brand_slug === params.marca) &&
      (tokens.length === 0 || (qsku && p.sku_norm === qsku) || tokens.every((t) => p.search_text.includes(t))),
  );
  const rank = (p: DemoProduct) =>
    qsku && p.sku_norm === qsku ? 0 : qsku && p.sku_norm.startsWith(qsku) ? 1 : normalizeSearch(p.name).startsWith(q) ? 2 : 3;
  matched.sort((a, b) => {
    if (sort === "relevance") return rank(a) - rank(b) || a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku);
    if (sort === "name_desc") return b.name.localeCompare(a.name);
    return a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku);
  });
  const start = (params.pagina - 1) * params.pageSize;
  return { items: matched.slice(start, start + params.pageSize), total: matched.length };
}

export function demoFacets() {
  const all = loadDemoProducts();
  const group = (key: "category" | "brand") => {
    const m = new Map<string, { slug: string; name: string; count: number }>();
    for (const p of all) {
      const slug = key === "category" ? p.category_slug : p.brand_slug;
      const name = key === "category" ? p.category_name : p.brand_name;
      if (!slug || !name) continue;
      const e = m.get(slug) ?? { slug, name, count: 0 };
      e.count++;
      m.set(slug, e);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  };
  return { categories: group("category"), brands: group("brand"), prices_visible: false };
}

export function demoProduct(sku: string): DemoProduct | null {
  const key = sku.trim().toUpperCase();
  return loadDemoProducts().find((p) => p.sku === key) ?? null;
}
