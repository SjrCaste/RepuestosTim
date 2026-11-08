/**
 * Lectura segura de planillas para importación.
 *  - CSV: detección de codificación (UTF-8 / Windows-1252), BOM y delimitador.
 *  - XLSX: lector propio sobre fflate. Sólo lee valores de celdas de la primera
 *    hoja: no evalúa fórmulas (usa el valor cacheado), no ejecuta macros, no
 *    resuelve vínculos externos. Rechaza libros con macros (vbaProject.bin) y
 *    el formato binario antiguo .xls (OLE2), con mensaje para convertir.
 *  Un archivo "TOCHTER.XLS" que en realidad es XLSX se detecta por contenido
 *  (firma ZIP), no por extensión.
 */
import Papa from "papaparse";
import { unzipSync, strFromU8 } from "fflate";

export type CellValue = string | number | boolean | null;

export interface ParsedTable {
  format: "csv" | "xlsx";
  headers: string[];
  rows: CellValue[][];
  warnings: string[];
  encoding?: string;
  sheetName?: string;
}

export const IMPORT_LIMITS = {
  maxFileBytes: 4 * 1024 * 1024,
  maxRows: 20_000,
  maxColumns: 60,
  maxUncompressedBytes: 60 * 1024 * 1024,
  maxCellChars: 5_000,
};

export class ImportFileError extends Error {}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE2_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function startsWith(buf: Uint8Array, magic: number[]) {
  return magic.every((b, i) => buf[i] === b);
}

export function detectFormat(buf: Uint8Array, filename: string): "csv" | "xlsx" {
  if (startsWith(buf, ZIP_MAGIC)) return "xlsx";
  if (startsWith(buf, OLE2_MAGIC)) {
    throw new ImportFileError(
      "El archivo es un Excel binario antiguo (.xls/OLE2). Abrilo en Excel y guardalo como .xlsx o .csv para importarlo.",
    );
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsm") || lower.endsWith(".xlsb")) {
    throw new ImportFileError("No se aceptan libros con macros (.xlsm/.xlsb).");
  }
  // Texto plano: no debe contener bytes nulos (binario disfrazado)
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  if (sample.includes(0)) throw new ImportFileError("El archivo no parece ser un CSV de texto válido.");
  return "csv";
}

export function parseImportFile(input: ArrayBuffer | Uint8Array, filename: string): ParsedTable {
  const buf = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (buf.byteLength === 0) throw new ImportFileError("El archivo está vacío.");
  if (buf.byteLength > IMPORT_LIMITS.maxFileBytes) {
    throw new ImportFileError(`El archivo supera el máximo de ${IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB.`);
  }
  const format = detectFormat(buf, filename);
  const table = format === "xlsx" ? parseXlsx(buf) : parseCsv(buf);
  return finalizeTable(table);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export function decodeText(buf: Uint8Array): { text: string; encoding: string } {
  let bytes = buf;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bytes = bytes.subarray(3);
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
  }
}

function parseCsv(buf: Uint8Array): ParsedTable {
  const { text, encoding } = decodeText(buf);
  const result = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t", "|"],
  });
  const warnings: string[] = [];
  if (encoding !== "utf-8") warnings.push(`Codificación detectada: ${encoding}. Se convirtió a UTF-8.`);
  const fatal = result.errors.filter((e) => e.type === "Delimiter" && result.data.length === 0);
  if (fatal.length) throw new ImportFileError("No se pudo detectar el separador del CSV.");
  for (const e of result.errors.slice(0, 5)) {
    if (e.type !== "Delimiter") warnings.push(`CSV fila ${(e.row ?? 0) + 1}: ${e.message}`);
  }
  const [headers = [], ...rows] = result.data;
  return { format: "csv", headers: headers.map(String), rows, warnings, encoding };
}

// ---------------------------------------------------------------------------
// XLSX (Office Open XML)
// ---------------------------------------------------------------------------
const XML_ENTITIES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      }
      return XML_ENTITIES[e] ?? m;
    })
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs);
  return m ? decodeXml(m[1]) : undefined;
}

function textOf(xml: string): string {
  // concatena <t>…</t> ignorando la fonética <rPh>
  const noPhonetic = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let out = "";
  for (const m of noPhonetic.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)) out += decodeXml(m[1] ?? "");
  return out;
}

export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseXlsx(buf: Uint8Array): ParsedTable {
  const warnings: string[] = [];
  let total = 0;
  let hasMacros = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(buf, {
      filter: (f) => {
        if (/vbaProject\.bin$/i.test(f.name) || /\.bin$/i.test(f.name) && /macro/i.test(f.name)) hasMacros = true;
        total += f.originalSize;
        if (total > IMPORT_LIMITS.maxUncompressedBytes) {
          throw new ImportFileError("El archivo descomprimido es demasiado grande.");
        }
        return (
          f.name === "xl/workbook.xml" ||
          f.name === "xl/_rels/workbook.xml.rels" ||
          f.name === "xl/sharedStrings.xml" ||
          /^xl\/worksheets\/[^/]+\.xml$/.test(f.name)
        );
      },
    });
  } catch (e) {
    if (e instanceof ImportFileError) throw e;
    throw new ImportFileError("No se pudo leer el archivo Excel (ZIP dañado o formato no soportado).");
  }
  if (hasMacros) throw new ImportFileError("El libro contiene macros (VBA). Por seguridad no se importa.");

  const workbook = files["xl/workbook.xml"] ? strFromU8(files["xl/workbook.xml"]) : "";
  if (!workbook) throw new ImportFileError("El archivo no es un libro Excel válido (falta xl/workbook.xml).");

  // Primera hoja visible
  const sheets = [...workbook.matchAll(/<sheet\b([^>]*)\/?>/g)].map((m) => ({
    name: attr(m[1], "name") ?? "Hoja",
    rid: attr(m[1], "r:id"),
    hidden: (attr(m[1], "state") ?? "visible") !== "visible",
  }));
  const sheet = sheets.find((s) => !s.hidden) ?? sheets[0];
  if (!sheet) throw new ImportFileError("El libro no contiene hojas.");
  if (sheets.length > 1) warnings.push(`El libro tiene ${sheets.length} hojas; se importa sólo "${sheet.name}".`);

  const rels = files["xl/_rels/workbook.xml.rels"] ? strFromU8(files["xl/_rels/workbook.xml.rels"]) : "";
  let target = "worksheets/sheet1.xml";
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    if (attr(m[1], "Id") === sheet.rid) target = attr(m[1], "Target") ?? target;
  }
  const sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  const sheetXml = files[sheetPath] ? strFromU8(files[sheetPath]) : "";
  if (!sheetXml) throw new ImportFileError(`No se encontró la hoja "${sheet.name}" dentro del archivo.`);

  const shared: string[] = [];
  if (files["xl/sharedStrings.xml"]) {
    const ss = strFromU8(files["xl/sharedStrings.xml"]);
    for (const m of ss.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) shared.push(textOf(m[1] ?? ""));
  }

  const grid: CellValue[][] = [];
  let formulaCells = 0;
  let rowCursor = 0;
  for (const rm of sheetXml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rAttr = attr(rm[1], "r");
    const rowIdx = rAttr ? parseInt(rAttr, 10) - 1 : rowCursor;
    rowCursor = rowIdx + 1;
    if (rowIdx >= IMPORT_LIMITS.maxRows + 1) {
      throw new ImportFileError(`La hoja supera el máximo de ${IMPORT_LIMITS.maxRows} filas.`);
    }
    const row: CellValue[] = [];
    let colCursor = 0;
    for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attr(cm[1], "r");
      const col = ref ? columnIndex(ref) : colCursor;
      colCursor = col + 1;
      if (col >= IMPORT_LIMITS.maxColumns) continue;
      const t = attr(cm[1], "t") ?? "n";
      const inner = cm[2] ?? "";
      if (/<f\b/.test(inner)) formulaCells++;
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value: CellValue = null;
      switch (t) {
        case "s":
          value = v !== undefined ? (shared[parseInt(v, 10)] ?? "") : null;
          break;
        case "inlineStr":
          value = textOf(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? "");
          break;
        case "str":
        case "d":
          value = v !== undefined ? decodeXml(v) : null;
          break;
        case "b":
          value = v === "1";
          break;
        case "e":
          value = null; // celda con error (#N/A, #REF!...)
          break;
        default:
          value = v !== undefined && v !== "" ? Number(v) : null;
          if (typeof value === "number" && !Number.isFinite(value)) value = null;
      }
      row[col] = value;
    }
    grid[rowIdx] = row;
  }
  if (formulaCells > 0) {
    warnings.push(`${formulaCells} celdas tienen fórmulas: se usó el último valor calculado guardado, sin ejecutarlas.`);
  }

  // La fila de encabezados se detecta en finalizeTable (puede haber filas de título arriba)
  const dense = Array.from({ length: grid.length }, (_, i) => Array.from(grid[i] ?? [], (c) => c ?? null));
  if (!dense.length) throw new ImportFileError("La hoja está vacía.");
  const [first, ...rest] = dense;
  return { format: "xlsx", headers: first.map((c) => (c === null ? "" : String(c))), rows: rest, warnings, sheetName: sheet.name };
}

// ---------------------------------------------------------------------------
const filled = (r: CellValue[]) => r.filter((c) => c !== null && c !== undefined && String(c).trim() !== "").length;

/**
 * Encabezado = primera fila (entre las 20 primeras) con al menos 3 celdas
 * completas. Así se saltean títulos como "Lista de Precios" arriba de la tabla.
 */
function finalizeTable(t: ParsedTable): ParsedTable {
  const all: CellValue[][] = [t.headers, ...t.rows];
  let headerIdx = all.slice(0, 20).findIndex((r) => filled(r) >= 3);
  if (headerIdx < 0) headerIdx = all.findIndex((r) => filled(r) > 0);
  if (headerIdx < 0) throw new ImportFileError("El archivo está vacío.");
  if (headerIdx > 0) t.warnings.push(`Se omitieron ${headerIdx} fila(s) de título antes de los encabezados.`);
  const width = Math.min(IMPORT_LIMITS.maxColumns, Math.max(...all.slice(headerIdx).map((r) => r.length)));
  const headerRow = Array.from({ length: width }, (_, i) => all[headerIdx][i] ?? "");
  t = { ...t, headers: headerRow.map((c) => (c === null ? "" : String(c))), rows: all.slice(headerIdx + 1) };
  const headers = t.headers.slice(0, IMPORT_LIMITS.maxColumns).map((h, i) => {
    const s = String(h ?? "").replace(/^﻿/, "").trim();
    return s || `Columna ${i + 1}`;
  });
  const rows = t.rows
    .map((r) =>
      headers.map((_, i) => {
        const v = r[i];
        if (typeof v === "string") return v.length > IMPORT_LIMITS.maxCellChars ? v.slice(0, IMPORT_LIMITS.maxCellChars) : v;
        return v ?? null;
      }),
    )
    .filter((r) => r.some((c) => c !== null && String(c).trim() !== ""));
  if (rows.length > IMPORT_LIMITS.maxRows) {
    throw new ImportFileError(`El archivo supera el máximo de ${IMPORT_LIMITS.maxRows} filas.`);
  }
  if (rows.length === 0) throw new ImportFileError("El archivo no tiene filas de datos.");
  return { ...t, headers, rows };
}
