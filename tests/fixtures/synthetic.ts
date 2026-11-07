/**
 * DATOS SINTÉTICOS SÓLO PARA PRUEBAS AUTOMÁTICAS.
 * No representan productos, precios ni stock reales de TIM REPUESTOS.
 * Imitan el formato de columnas de tim_repuestos_catalogo_tochter.csv.
 */
import { zipSync, strToU8 } from "fflate";

export const SYNTHETIC_HEADER =
  "sku,nombre,marca,categoria,precio_venta_ars,descripcion_adicional,imagen_referencia_original,activo";

export function syntheticCsv(n = 980): string {
  const cats = ["RUBRO PRUEBA A", "RUBRO PRUEBA B", "Rubro Prueba C"];
  const lines = [SYNTHETIC_HEADER];
  lines.push(`10000TOC,PRODUCTO SINTETICO DE PRUEBA,TOCHTER,${cats[0]},"12.345,50",,C:\\FOTOS\\TOCHTER\\10000TOC.JPG,verdadero`);
  for (let i = 1; i < n; i++) {
    const sku = `${10000 + i}TOC`;
    lines.push(`${sku},ITEM SINTETICO ${i} ÁNGULO,TOCHTER,${cats[i % 3]},${1000 + i},,C:\\FOTOS\\TOCHTER\\${sku}.JPG,verdadero`);
  }
  return lines.join("\r\n");
}

/** XLSX mínimo válido con strings compartidos, número, fórmula y celda inline. */
export function syntheticXlsx(opts: { withMacro?: boolean } = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="TOCHTER" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    ),
    "xl/sharedStrings.xml": strToU8(
      `<?xml version="1.0"?><sst><si><t>CODIGO</t></si><si><t>DESCRIPCION</t></si><si><t>RUBRO</t></si><si><t>PRVENTA</t></si><si><t>PRCOSTO</t></si><si><t>10000TOC</t></si><si><r><t>BOMBA </t></r><r><t>SINTÉTICA &amp; CO</t></r></si><si><t>BOMBAS DE AGUA</t></si></sst>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0"?><worksheet><sheetData>` +
        `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>` +
        `<row r="2"><c r="A2" t="s"><v>5</v></c><c r="B2" t="s"><v>6</v></c><c r="C2" t="s"><v>7</v></c><c r="D2"><f>E2*2</f><v>1.234</v></c><c r="E2"><v>0.617</v></c></row>` +
        `<row r="4"><c r="A4" t="inlineStr"><is><t>10001TOC</t></is></c><c r="B4" t="str"><v>FILTRO_x0020_SINT</v></c><c r="D4" t="e"><v>#N/A</v></c></row>` +
        `</sheetData></worksheet>`,
    ),
  };
  if (opts.withMacro) files["xl/vbaProject.bin"] = new Uint8Array([1, 2, 3]);
  return zipSync(files);
}
