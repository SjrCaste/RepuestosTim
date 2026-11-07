import { normalizeHeader } from "./normalize";

export type ImportKind = "catalog" | "costs";

export type CatalogField =
  | "sku"
  | "name"
  | "brand"
  | "category"
  | "sale_price_ars"
  | "description"
  | "original_image_path"
  | "active";

export type CostField = "sku" | "cost_price_ars";
export type AnyField = CatalogField | CostField;

export interface FieldDef {
  key: AnyField;
  label: string;
  required: boolean;
  help?: string;
  synonyms: string[];
}

export const CATALOG_FIELDS: FieldDef[] = [
  { key: "sku", label: "SKU / código", required: true, synonyms: ["sku", "codigo", "cod", "codigo_articulo", "cod_articulo", "articulo", "code"] },
  { key: "name", label: "Nombre", required: true, synonyms: ["nombre", "name", "descripcion", "descrip", "detalle", "producto"] },
  { key: "brand", label: "Marca", required: false, synonyms: ["marca", "brand", "fabricante"] },
  { key: "category", label: "Categoría / rubro", required: false, synonyms: ["categoria", "rubro", "familia", "category", "linea"] },
  {
    key: "sale_price_ars",
    label: "Precio de venta (ARS)",
    required: false,
    help: "Se guarda pero NO se muestra a clientes hasta activar “precios visibles” en Configuración.",
    synonyms: ["precio_venta_ars", "prventa", "precio_venta", "pventa", "precio", "price"],
  },
  { key: "description", label: "Descripción adicional", required: false, synonyms: ["descripcion_adicional", "observaciones", "obs", "notas", "description"] },
  {
    key: "original_image_path",
    label: "Ruta de imagen original",
    required: false,
    help: "Rutas locales (C:\\FOTOS\\...) no son URLs: sólo se usan para asociar fotos subidas después.",
    synonyms: ["imagen_referencia_original", "foto", "imagen", "image", "ruta_imagen"],
  },
  { key: "active", label: "Activo", required: false, synonyms: ["activo", "active", "habilitado"] },
];

export const COST_FIELDS: FieldDef[] = [
  { key: "sku", label: "SKU / código", required: true, synonyms: ["sku", "codigo", "cod", "codigo_articulo", "articulo", "code"] },
  {
    key: "cost_price_ars",
    label: "Precio de costo (ARS)",
    required: true,
    help: "Dato reservado: se guarda en una tabla privada, nunca visible para clientes.",
    synonyms: ["prcosto", "precio_costo", "costo", "cost", "cost_price_ars", "pcosto"],
  },
];

export function fieldsFor(kind: ImportKind): FieldDef[] {
  return kind === "catalog" ? CATALOG_FIELDS : COST_FIELDS;
}

/** field → índice de columna (o -1 si no se importa) */
export type ColumnMapping = Partial<Record<AnyField, number>>;

export function suggestMapping(headers: string[], kind: ImportKind): ColumnMapping {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const field of fieldsFor(kind)) {
    let idx = -1;
    for (const syn of field.synonyms) {
      idx = norm.findIndex((h, i) => !used.has(i) && h === syn);
      if (idx >= 0) break;
    }
    mapping[field.key] = idx;
    if (idx >= 0) used.add(idx);
  }
  return mapping;
}
