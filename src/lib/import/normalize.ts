/**
 * Normalización de datos de origen (planillas de proveedor / sistemas viejos).
 * Regla: limpiar formato (espacios, codificación, mayúsculas de rubros) pero
 * NUNCA reinterpretar contenido técnico (compatibilidades, medidas, modelos).
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g;
// Secuencias típicas de UTF-8 leído como Latin-1 ("Ã±" en lugar de "ñ").
const MOJIBAKE = /Ã[\u0080-\u00BF]|Â[\u00A0-\u00BF]|â€/;

export function fixMojibake(s: string): string {
  if (!MOJIBAKE.test(s)) return s;
  try {
    const bytes = Uint8Array.from(Array.from(s, (ch) => ch.charCodeAt(0) & 0xff));
    if (Array.from(s).some((ch) => ch.charCodeAt(0) > 0xff)) return s;
    const fixed = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return fixed;
  } catch {
    return s;
  }
}

/** Limpia texto: NFC, sin caracteres de control, espacios colapsados. */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  s = fixMojibake(s);
  s = s.normalize("NFC").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return s;
}

/** Igual que public.normalize_search() en SQL: minúsculas sin acentos. */
export function normalizeSearch(value: string): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Igual que public.normalize_sku(): sólo A-Z0-9 en mayúsculas. */
export function normalizeSkuKey(value: string): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

/** SKU tal como se guarda: trim, espacios colapsados, mayúsculas. */
export function cleanSku(value: unknown): string {
  return cleanText(value).toUpperCase();
}

/** Igual que public.slugify(). */
export function slugify(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Nombre visible de rubro/marca. Si viene TODO EN MAYÚSCULAS se pasa a
 * "Oración" ("BOMBAS DE AGUA" → "Bombas de agua"). Si ya tiene mayúsculas y
 * minúsculas se respeta. El texto original se conserva en source_name.
 */
export function displayCategoryName(value: unknown): string {
  const s = cleanText(value);
  if (!s) return "";
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters && letters === letters.toUpperCase()) {
    const lower = s.toLocaleLowerCase("es-AR");
    return lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
  }
  return s;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Precio en ARS. Acepta números de Excel y textos con formato argentino o
 * internacional: "$ 12.345,67", "12345.67", "12.345", "12,5".
 * Vacío → null. Negativo o no numérico → error.
 */
export function parsePrice(value: unknown): ParseResult<number | null> {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Precio inválido o negativo" };
    return { ok: true, value: Math.round(value * 100) / 100 };
  }
  let s = cleanText(value).replace(/\s/g, "").replace(/^(ARS|\$|AR\$)+/i, "").replace(/\$/g, "");
  if (s === "" || s === "-") return { ok: true, value: null };
  if (/^-/.test(s)) return { ok: false, error: "Precio negativo" };
  if (!/^[0-9.,]+$/.test(s)) return { ok: false, error: `Precio no numérico: "${cleanText(value)}"` };

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // el último separador es el decimal
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    if (/^\d{1,3}(,\d{3})+$/.test(s) && (s.match(/,/g)?.length ?? 0) > 1) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  } else if (lastDot >= 0) {
    // "12.345" o "1.234.567" → miles (formato argentino); "12.5" → decimal
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  }
  if ((s.match(/\./g)?.length ?? 0) > 1) return { ok: false, error: `Formato de precio ambiguo: "${cleanText(value)}"` };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, error: `Precio no numérico: "${cleanText(value)}"` };
  if (n > 999_999_999_999) return { ok: false, error: "Precio fuera de rango" };
  return { ok: true, value: Math.round(n * 100) / 100 };
}

const TRUE_VALUES = new Set(["true", "verdadero", "si", "sí", "s", "1", "x", "activo", "yes", "y"]);
const FALSE_VALUES = new Set(["false", "falso", "no", "n", "0", "inactivo"]);

/** Booleano "activo". Vacío → true (por defecto activo). */
export function parseBool(value: unknown): ParseResult<boolean> {
  if (value === null || value === undefined) return { ok: true, value: true };
  if (typeof value === "boolean") return { ok: true, value };
  if (typeof value === "number") return { ok: true, value: value !== 0 };
  const s = cleanText(value).toLowerCase();
  if (s === "") return { ok: true, value: true };
  if (TRUE_VALUES.has(s)) return { ok: true, value: true };
  if (FALSE_VALUES.has(s)) return { ok: true, value: false };
  return { ok: false, error: `Valor de "activo" no reconocido: "${s}"` };
}

/** Basename de una ruta Windows/Unix: C:\FOTOS\TOCHTER\10000TOC.JPG → 10000TOC.JPG */
export function fileBasename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

/** Normaliza un encabezado de columna para mapear sinónimos. */
export function normalizeHeader(h: unknown): string {
  return normalizeSearch(String(h ?? ""))
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
