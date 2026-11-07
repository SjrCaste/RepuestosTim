/**
 * Ensayo completo de importación del archivo REAL contra las migraciones reales
 * en una base Postgres local en memoria (PGlite). No toca Supabase.
 * Importa dos veces y verifica: sin duplicados, segunda pasada sin altas,
 * búsqueda del SKU de ejemplo como cliente y que el costo no sea visible.
 * Uso: npm run catalog:import-dry-run -- data/private/tim_repuestos_catalogo_tochter.csv [SKU]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { as, createDb, createUser } from "../tests/db/harness";
import { parseImportFile } from "../src/lib/import/parse";
import { suggestMapping } from "../src/lib/import/mapping";
import { validateCatalog } from "../src/lib/import/validate";

const file = process.argv[2];
const probe = (process.argv[3] ?? "10000TOC").toUpperCase();
if (!file) {
  console.error("Uso: npm run catalog:import-dry-run -- <ruta al CSV/XLSX> [SKU]");
  process.exit(1);
}

const table = parseImportFile(readFileSync(file), path.basename(file));
const report = validateCatalog(table, suggestMapping(table.headers, "catalog"));
const db = await createDb();
const admin = await createUser(db, { email: "admin@local" });
await db.query(`select private.set_admin('admin@local')`);
const client = await createUser(db, { email: "cliente@local" });
await as(db, { role: "authenticated", uid: admin }, (tx) => tx.query(`select public.admin_set_profile_status($1,'active')`, [client]));

async function run() {
  return as(db, { role: "authenticated", uid: admin }, async (tx) => {
    const t = { created: 0, updated: 0, unchanged: 0 };
    for (let i = 0; i < report.valid.length; i += 500) {
      const r = await tx.query<{ r: typeof t }>(`select public.admin_import_products(null, $1, $2::jsonb) as r`, [
        report.mappedFields,
        JSON.stringify(report.valid.slice(i, i + 500)),
      ]);
      t.created += r.rows[0].r.created;
      t.updated += r.rows[0].r.updated;
      t.unchanged += r.rows[0].r.unchanged;
    }
    return t;
  });
}

console.log(`Filas: ${report.totalRows} · válidas: ${report.valid.length} · con error: ${report.errors.length}`);
console.log("1ª importación:", await run());
console.log("2ª importación:", await run());
const c = await db.query<{ n: number; d: number }>(`select count(*)::int n, count(distinct sku)::int d from public.products`);
console.log(`Productos en base: ${c.rows[0].n} (SKU distintos: ${c.rows[0].d})`);
const brands = await db.query<{ n: number }>(`select count(*)::int n from public.brands`);
const cats = await db.query<{ name: string }>(`select name from public.categories order by name`);
console.log(`Marcas: ${brands.rows[0].n} · Rubros (${cats.rows.length}): ${cats.rows.map((r) => r.name).join(", ")}`);
const found = await as(db, { role: "authenticated", uid: client }, (tx) =>
  tx.query<{ sku: string; name: string; sale_price_ars: string | null }>(`select sku, name, sale_price_ars from public.catalog_search($1) limit 3`, [probe]),
);
console.log(`Búsqueda de cliente "${probe}":`, found.rows);
console.log("(precio null = oculto, como corresponde con prices_visible_to_customers = false)");
