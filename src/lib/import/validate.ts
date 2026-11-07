import type { CellValue, ParsedTable } from "./parse";
import type { ColumnMapping, ImportKind, CatalogField } from "./mapping";
import { fieldsFor } from "./mapping";
import { cleanSku, cleanText, displayCategoryName, parseBool, parsePrice, slugify } from "./normalize";

export interface RowIssue {
  /** número de fila tal como se ve en la planilla (encabezado = 1) */
  row: number;
  sku?: string;
  field?: string;
  message: string;
  value?: string;
}

export interface CatalogRow {
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  category_source: string | null;
  sale_price_ars: number | null;
  description: string | null;
  original_image_path: string | null;
  active: boolean;
  attributes: Record<string, unknown>;
}

export interface CostRow {
  sku: string;
  cost_price_ars: number;
}

export interface ValidationReport<T> {
  kind: ImportKind;
  totalRows: number;
  valid: T[];
  errors: RowIssue[];
  warnings: RowIssue[];
  /** filas repetidas idénticas que se omitieron */
  skippedDuplicates: number;
  /** SKUs repetidos con datos distintos (todas sus filas se rechazan) */
  conflictingDuplicates: string[];
  mappedFields: string[];
  brands: string[];
  categories: string[];
}

const MAX = { sku: 64, name: 300, brand: 120, category: 120, description: 4000, image: 500 };

function cell(row: CellValue[], idx: number | undefined): CellValue {
  return idx === undefined || idx < 0 ? null : (row[idx] ?? null);
}

function preview(v: CellValue): string {
  return v === null ? "" : String(v).slice(0, 80);
}

export function validateMapping(kind: ImportKind, mapping: ColumnMapping): string[] {
  const errs: string[] = [];
  const seen = new Map<number, string>();
  for (const f of fieldsFor(kind)) {
    const idx = mapping[f.key];
    if (f.required && (idx === undefined || idx < 0)) errs.push(`Falta asignar la columna para “${f.label}”.`);
    if (idx !== undefined && idx >= 0) {
      if (seen.has(idx)) errs.push(`La misma columna está asignada a “${seen.get(idx)}” y “${f.label}”.`);
      seen.set(idx, f.label);
    }
  }
  return errs;
}

export function validateCatalog(table: ParsedTable, mapping: ColumnMapping): ValidationReport<CatalogRow> {
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const bySku = new Map<string, { row: number; data: CatalogRow; key: string }[]>();
  const mapped = (Object.keys(mapping) as CatalogField[]).filter((k) => (mapping[k] ?? -1) >= 0);

  table.rows.forEach((r, i) => {
    const rowNum = i + 2;
    const rawSku = cell(r, mapping.sku);
    const sku = cleanSku(rawSku);
    const rawName = cell(r, mapping.name);
    const name = cleanText(rawName);
    const rowErrors: RowIssue[] = [];

    if (!sku) rowErrors.push({ row: rowNum, field: "sku", message: "SKU vacío" });
    else if (sku.length > MAX.sku) rowErrors.push({ row: rowNum, sku, field: "sku", message: `SKU de más de ${MAX.sku} caracteres` });
    if (!name) rowErrors.push({ row: rowNum, sku, field: "name", message: "Nombre vacío" });
    else if (name.length > MAX.name) rowErrors.push({ row: rowNum, sku, field: "name", message: `Nombre de más de ${MAX.name} caracteres` });

    const brand = cleanText(cell(r, mapping.brand)) || null;
    if (brand && (brand.length > MAX.brand || !slugify(brand))) rowErrors.push({ row: rowNum, sku, field: "brand", message: "Marca inválida", value: brand });

    const rawCategory = cleanText(cell(r, mapping.category));
    const category = displayCategoryName(rawCategory) || null;
    if (category && (category.length > MAX.category || !slugify(category))) {
      rowErrors.push({ row: rowNum, sku, field: "category", message: "Categoría inválida", value: category });
    }

    let price: number | null = null;
    if ((mapping.sale_price_ars ?? -1) >= 0) {
      const p = parsePrice(cell(r, mapping.sale_price_ars));
      if (!p.ok) rowErrors.push({ row: rowNum, sku, field: "sale_price_ars", message: p.error, value: preview(cell(r, mapping.sale_price_ars)) });
      else price = p.value;
    }

    let active = true;
    if ((mapping.active ?? -1) >= 0) {
      const b = parseBool(cell(r, mapping.active));
      if (!b.ok) rowErrors.push({ row: rowNum, sku, field: "active", message: b.error });
      else active = b.value;
    }

    const description = cleanText(cell(r, mapping.description)).slice(0, MAX.description) || null;
    const image = cleanText(cell(r, mapping.original_image_path)).slice(0, MAX.image) || null;

    if (rowErrors.length) {
      errors.push(...rowErrors);
      return;
    }

    // Se conserva el texto original sólo si la normalización lo modificó
    const attributes: Record<string, unknown> = {};
    const source: Record<string, string> = {};
    if (typeof rawName === "string" && rawName !== name && rawName.trim() !== name) source.name = rawName.slice(0, 300);
    if (rawCategory && category && rawCategory !== category) source.category = rawCategory;
    if (Object.keys(source).length) attributes.source_raw = source;

    const data: CatalogRow = {
      sku,
      name,
      brand,
      category,
      category_source: rawCategory || null,
      sale_price_ars: price,
      description,
      original_image_path: image,
      active,
      attributes,
    };
    if (price === 0) warnings.push({ row: rowNum, sku, field: "sale_price_ars", message: "Precio en 0: revisar antes de publicar precios" });
    if (!brand && mapped.includes("brand")) warnings.push({ row: rowNum, sku, field: "brand", message: "Sin marca" });
    if (!category && mapped.includes("category")) warnings.push({ row: rowNum, sku, field: "category", message: "Sin categoría" });

    const key = JSON.stringify(data);
    const list = bySku.get(sku) ?? [];
    list.push({ row: rowNum, data, key });
    bySku.set(sku, list);
  });

  const valid: CatalogRow[] = [];
  const conflicting: string[] = [];
  let skipped = 0;
  for (const [sku, list] of bySku) {
    const distinct = new Set(list.map((x) => x.key));
    if (distinct.size > 1) {
      conflicting.push(sku);
      for (const x of list) {
        errors.push({ row: x.row, sku, field: "sku", message: `SKU duplicado con datos distintos (filas ${list.map((l) => l.row).join(", ")})` });
      }
      continue;
    }
    valid.push(list[0].data);
    if (list.length > 1) {
      skipped += list.length - 1;
      warnings.push({ row: list[1].row, sku, field: "sku", message: `SKU repetido ${list.length} veces con datos idénticos: se importa una sola vez` });
    }
  }

  errors.sort((a, b) => a.row - b.row);
  warnings.sort((a, b) => a.row - b.row);
  return {
    kind: "catalog",
    totalRows: table.rows.length,
    valid,
    errors,
    warnings,
    skippedDuplicates: skipped,
    conflictingDuplicates: conflicting,
    mappedFields: mapped,
    brands: [...new Set(valid.map((v) => v.brand).filter(Boolean) as string[])].sort(),
    categories: [...new Set(valid.map((v) => v.category).filter(Boolean) as string[])].sort(),
  };
}

export function validateCosts(table: ParsedTable, mapping: ColumnMapping): ValidationReport<CostRow> {
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const bySku = new Map<string, { row: number; cost: number }[]>();

  table.rows.forEach((r, i) => {
    const rowNum = i + 2;
    const sku = cleanSku(cell(r, mapping.sku));
    if (!sku) return void errors.push({ row: rowNum, field: "sku", message: "SKU vacío" });
    const p = parsePrice(cell(r, mapping.cost_price_ars));
    if (!p.ok) return void errors.push({ row: rowNum, sku, field: "cost_price_ars", message: p.error });
    if (p.value === null) return void warnings.push({ row: rowNum, sku, field: "cost_price_ars", message: "Costo vacío: se omite" });
    const list = bySku.get(sku) ?? [];
    list.push({ row: rowNum, cost: p.value });
    bySku.set(sku, list);
  });

  const valid: CostRow[] = [];
  const conflicting: string[] = [];
  let skipped = 0;
  for (const [sku, list] of bySku) {
    if (new Set(list.map((l) => l.cost)).size > 1) {
      conflicting.push(sku);
      list.forEach((l) => errors.push({ row: l.row, sku, field: "sku", message: "SKU duplicado con costos distintos" }));
      continue;
    }
    valid.push({ sku, cost_price_ars: list[0].cost });
    skipped += list.length - 1;
  }
  errors.sort((a, b) => a.row - b.row);
  return {
    kind: "costs",
    totalRows: table.rows.length,
    valid,
    errors,
    warnings,
    skippedDuplicates: skipped,
    conflictingDuplicates: conflicting,
    mappedFields: ["sku", "cost_price_ars"],
    brands: [],
    categories: [],
  };
}
