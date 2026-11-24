/**
 * Script de siembra/importación del catálogo completo a Supabase.
 * Lee data/private/TOCHTER.XLS (980 productos), extrae características técnicas
 * detalladas (posición, lado, vehículo, años, accesorios, medidas) y las guarda
 * en public.brands, public.categories y public.products en Supabase.
 *
 * Uso: npx tsx scripts/seed-catalog.ts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseImportFile } from "../src/lib/import/parse";
import { suggestMapping } from "../src/lib/import/mapping";
import { validateCatalog } from "../src/lib/import/validate";

// Cargar variables de entorno desde .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Error: Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Parsea características técnicas desde el nombre y las observaciones */
export function extractSpecs(name: string, category: string, observac?: string | null): Record<string, string> {
  const specs: Record<string, string> = {
    Rubro: category,
    Marca: "TOCHTER",
    "Canal de venta": "Mayorista y Minorista",
  };

  const upper = name.toUpperCase();

  // Posición y lado
  if (upper.includes("DEL/DER") || upper.includes("DEL.DER") || upper.includes("DER.")) {
    specs["Posición / Lado"] = "Delantero Derecho";
    specs["Eje"] = "Delantero";
    specs["Lado"] = "Derecho";
  } else if (upper.includes("DEL/IZQ") || upper.includes("DEL.IZQ") || upper.includes("IZQ.")) {
    specs["Posición / Lado"] = "Delantero Izquierdo";
    specs["Eje"] = "Delantero";
    specs["Lado"] = "Izquierdo";
  } else if (upper.includes("TRAS/DER")) {
    specs["Posición / Lado"] = "Trasero Derecho";
    specs["Eje"] = "Trasero";
    specs["Lado"] = "Derecho";
  } else if (upper.includes("TRAS/IZQ")) {
    specs["Posición / Lado"] = "Trasero Izquierdo";
    specs["Eje"] = "Trasero";
    specs["Lado"] = "Izquierdo";
  } else if (upper.includes("TRAS.") || upper.includes("TRAS")) {
    specs["Posición / Lado"] = "Trasero";
    specs["Eje"] = "Trasero";
  } else if (upper.includes("DEL.") || upper.includes("DEL")) {
    specs["Posición / Lado"] = "Delantero";
    specs["Eje"] = "Delantero";
  }

  if (upper.includes("SUP.")) specs["Ubicación"] = "Superior";
  if (upper.includes("INF.")) specs["Ubicación"] = "Inferior";

  // Accesorios / Especificaciones mecánicas
  if (upper.includes("C/ROT")) specs["Rótula"] = "Incluye Rótula";
  if (upper.includes("S/ROT")) specs["Rótula"] = "Sin Rótula";
  if (upper.includes("C/CRAP") || upper.includes("C/CRA")) specs["Crapodina"] = "Con Crapodina";
  if (upper.includes("C/ABS")) specs["Sistema de frenos"] = "Con ABS";
  if (upper.includes("S/ABS")) specs["Sistema de frenos"] = "Sin ABS";
  if (upper.includes("C/RUL")) specs["Rulemán"] = "Con Rulemán incluido";
  if (upper.includes("S/RUL")) specs["Rulemán"] = "Sin Rulemán";
  if (upper.includes("DIR.HID") || upper.includes("DH")) specs["Dirección"] = "Dirección Hidráulica";
  if (upper.includes("DIR.MEC") || upper.includes("DM")) specs["Dirección"] = "Dirección Mecánica";
  if (upper.includes("4X4")) specs["Tracción"] = "4x4";
  if (upper.includes("4X2")) specs["Tracción"] = "4x2";

  // Extraer vehículo / aplicación
  const aplMatch = name.match(/APL\.?\s*([A-Z0-9.,\s\-/]+?)(?:\s+(?:DEL|TRAS|0\d|1\d|2\d|9\d|\.\.\/|\d{2}\/)|$)/i);
  if (aplMatch && aplMatch[1]) {
    const veh = aplMatch[1].replace(/^(?:CHEV|CITROEN|PEUGEOT|FIAT|FORD|HONDA|RENAULT|TOYOTA|VW)\.?\s*/i, "").trim();
    if (veh.length > 2) specs["Vehículo"] = veh;
  }

  // Extraer años aproximados (ej. 09/18, 08/..., 12/à, 96/00)
  const yearMatch = name.match(/(\d{2})\/(\d{2}|à|\.\.\.)/);
  if (yearMatch) {
    const start = parseInt(yearMatch[1], 10);
    const startFull = start > 50 ? 1900 + start : 2000 + start;
    if (yearMatch[2] === "à" || yearMatch[2] === "...") {
      specs["Años de aplicación"] = `${startFull} en adelante`;
    } else {
      const end = parseInt(yearMatch[2], 10);
      const endFull = end > 50 ? 1900 + end : 2000 + end;
      specs["Años de aplicación"] = `${startFull} a ${endFull}`;
    }
  }

  // Observaciones adicionales
  if (observac && observac.trim()) {
    const cleanObs = observac.trim();
    if (cleanObs.includes("ABS:") || cleanObs.includes("RULEMAN:") || cleanObs.includes("ALTO:")) {
      const parts = cleanObs.split(/[/.]+/);
      for (const p of parts) {
        const [k, v] = p.split(":").map((s) => s.trim());
        if (k && v) specs[k] = v;
      }
    } else {
      specs["Notas adicionales"] = cleanObs;
    }
  }

  return specs;
}

async function main() {
  console.log("Leyendo archivo TOCHTER.XLS...");
  const filePath = path.resolve(process.cwd(), "data/private/TOCHTER.XLS");
  if (!existsSync(filePath)) {
    console.error("No se encontró data/private/TOCHTER.XLS");
    process.exit(1);
  }

  const table = parseImportFile(readFileSync(filePath), "TOCHTER.XLS");
  const mapping = suggestMapping(table.headers, "catalog");
  const report = validateCatalog(table, mapping);

  console.log(`Filas detectadas: ${report.totalRows} · Válidas: ${report.valid.length}`);

  // 1. Insertar marcas
  console.log("Insertando marcas...");
  const brands = [...new Set(report.valid.map((r) => r.brand).filter((r): r is string => Boolean(r)))];
  for (const b of brands) {
    await supabase.from("brands").upsert({ name: b, slug: b.toLowerCase() }, { onConflict: "slug" });
  }

  // 2. Insertar rubros / categorías
  console.log("Insertando rubros/categorías...");
  const categories = [...new Set(report.valid.map((r) => r.category).filter((r): r is string => Boolean(r)))];
  for (const c of categories) {
    const slug = c
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    await supabase.from("categories").upsert({ name: c, slug, active: true }, { onConflict: "slug" });
  }

  // Obtener IDs de marcas y categorías
  const { data: dbBrands } = await supabase.from("brands").select("id, slug");
  const { data: dbCats } = await supabase.from("categories").select("id, slug, name");
  const brandMap = new Map((dbBrands ?? []).map((b) => [b.slug, b.id]));
  const catMap = new Map(
    (dbCats ?? []).map((c) => [
      c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      c.id,
    ]),
  );

  // 3. Preparar filas de productos en lotes
  console.log("Preparando 980 productos con características técnicas...");
  const productRows = report.valid.map((p) => {
    const catNorm = (p.category ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const brandId = p.brand ? brandMap.get(p.brand.toLowerCase()) : null;
    const catId = catMap.get(catNorm) ?? null;
    const specs = extractSpecs(p.name, p.category ?? "Repuestos", p.description);

    return {
      sku: p.sku.toUpperCase().trim(),
      name: p.name.trim(),
      brand_id: brandId,
      category_id: catId,
      description: p.description ? p.description.trim() : null,
      sale_price_ars: p.sale_price_ars ?? null,
      active: true,
      original_image_path: p.original_image_path,
      stock_status: "available",
      attributes: {
        specs,
        channel: "Mayorista y Minorista",
        origin: "TOCHTER",
      },
    };
  });

  // 4. Insertar en lotes de 100
  console.log("Guardando productos en Supabase...");
  const BATCH_SIZE = 100;
  let totalInserted = 0;

  for (let i = 0; i < productRows.length; i += BATCH_SIZE) {
    const batch = productRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("products").upsert(batch, { onConflict: "sku" });
    if (error) {
      console.error(`Error en lote ${i} - ${i + batch.length}:`, error.message);
    } else {
      totalInserted += batch.length;
      process.stdout.write(`Progreso: ${totalInserted}/${productRows.length} productos guardados...\r`);
    }
  }

  console.log(`\n¡Listo! Se guardaron ${totalInserted} productos con especificaciones completas.`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
