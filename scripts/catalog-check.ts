/**
 * Verificación offline del archivo de catálogo real (no toca la base).
 * Uso:  npm run catalog:check -- data/private/tim_repuestos_catalogo_tochter.csv [SKU_A_BUSCAR]
 *       npm run catalog:check -- data/private/TOCHTER.XLS
 * Reporta filas, SKU únicos, duplicados, marcas, rubros, errores y un SKU de ejemplo.
 * Nunca imprime costos (si el archivo trae PRCOSTO sólo informa que la columna existe).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseImportFile } from "../src/lib/import/parse";
import { suggestMapping } from "../src/lib/import/mapping";
import { validateCatalog } from "../src/lib/import/validate";

const file = process.argv[2];
const probe = (process.argv[3] ?? "10000TOC").toUpperCase();
if (!file) {
  console.error("Uso: npm run catalog:check -- <ruta al CSV/XLSX> [SKU]");
  process.exit(1);
}

const table = parseImportFile(readFileSync(file), path.basename(file));
const mapping = suggestMapping(table.headers, "catalog");
const costCol = suggestMapping(table.headers, "costs").cost_price_ars ?? -1;
const report = validateCatalog(table, mapping);

const byCat = new Map<string, number>();
for (const r of report.valid) byCat.set(r.category ?? "(sin rubro)", (byCat.get(r.category ?? "(sin rubro)") ?? 0) + 1);
const withPrice = report.valid.filter((r) => r.sale_price_ars !== null).length;
const withImg = report.valid.filter((r) => r.original_image_path).length;
const sample = report.valid.find((r) => r.sku === probe);

console.log(`Archivo: ${file} (${table.format}${table.sheetName ? `, hoja "${table.sheetName}"` : ""}${table.encoding ? `, ${table.encoding}` : ""})`);
console.log(`Encabezados: ${table.headers.join(" | ")}`);
console.log(`Mapeo sugerido: ${JSON.stringify(mapping)}`);
if (costCol >= 0) console.log(`Columna de costo detectada ("${table.headers[costCol]}"): se importa sólo con el modo "Costos". Valores no mostrados.`);
console.log(`Filas de datos: ${report.totalRows}`);
console.log(`Válidas (SKU únicos a importar): ${report.valid.length}`);
console.log(`Con error: ${report.errors.length} · Duplicados idénticos omitidos: ${report.skippedDuplicates} · SKU en conflicto: ${report.conflictingDuplicates.length}`);
console.log(`Marcas (${report.brands.length}): ${report.brands.join(", ")}`);
console.log(`Rubros (${report.categories.length}):`);
for (const [c, n] of [...byCat].sort()) console.log(`  - ${c}: ${n}`);
console.log(`Con precio de venta: ${withPrice} · Con ruta de imagen original: ${withImg}`);
console.log(sample ? `SKU ${probe}: "${sample.name}" · ${sample.brand ?? "-"} · ${sample.category ?? "-"}` : `SKU ${probe}: NO encontrado`);
if (report.errors.length) {
  console.log("Primeros errores:");
  for (const e of report.errors.slice(0, 15)) console.log(`  fila ${e.row} ${e.sku ?? ""} [${e.field}] ${e.message}`);
}
if (table.warnings.length) console.log(`Advertencias de lectura: ${table.warnings.join(" / ")}`);
