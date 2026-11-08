import { describe, expect, it } from "vitest";
import { parseImportFile, ImportFileError } from "@/lib/import/parse";
import { suggestMapping } from "@/lib/import/mapping";
import { validateCatalog, validateCosts, validateMapping } from "@/lib/import/validate";
import { syntheticCsv, syntheticXlsx, SYNTHETIC_HEADER } from "../fixtures/synthetic";

const enc = (s: string) => new TextEncoder().encode(s);

describe("parseo CSV", () => {
  it("lee 980 filas, mapea columnas del CSV preparado y valida", () => {
    const t = parseImportFile(enc(syntheticCsv(980)), "tim_repuestos_catalogo_tochter.csv");
    expect(t.rows).toHaveLength(980);
    const m = suggestMapping(t.headers, "catalog");
    expect(validateMapping("catalog", m)).toEqual([]);
    expect(m).toMatchObject({ sku: 0, name: 1, brand: 2, category: 3, sale_price_ars: 4, description: 5, original_image_path: 6, active: 7 });
    const r = validateCatalog(t, m);
    expect(r.valid).toHaveLength(980);
    expect(r.errors).toHaveLength(0);
    expect(r.brands).toEqual(["TOCHTER"]);
    expect(r.categories).toEqual(["Rubro Prueba C", "Rubro prueba a", "Rubro prueba b"]);
    const first = r.valid.find((x) => x.sku === "10000TOC")!;
    expect(first.sale_price_ars).toBe(12345.5);
    expect(first.original_image_path).toBe("C:\\FOTOS\\TOCHTER\\10000TOC.JPG");
  });

  it("detecta Windows-1252 y separador ;", () => {
    const text = "sku;nombre;categoria\r\nA1;PIÑÓN ÁRBOL;EMBRAGUE\r\n";
    const bytes = Uint8Array.from(Array.from(text, (c) => c.charCodeAt(0)));
    const t = parseImportFile(bytes, "x.csv");
    expect(t.encoding).toBe("windows-1252");
    expect(t.rows[0]).toEqual(["A1", "PIÑÓN ÁRBOL", "EMBRAGUE"]);
  });

  it("duplicados: idénticos se omiten, distintos se rechazan; precio inválido rechaza la fila", () => {
    const csv = [
      SYNTHETIC_HEADER,
      "A1,UNO,TOCHTER,R,100,,,verdadero",
      "A1,UNO,TOCHTER,R,100,,,verdadero",
      "b2,DOS,TOCHTER,R,100,,,verdadero",
      "B2,DOS DISTINTO,TOCHTER,R,100,,,verdadero",
      "C3,TRES,TOCHTER,R,abc,,,verdadero",
      ",SIN SKU,TOCHTER,R,1,,,verdadero",
    ].join("\n");
    const t = parseImportFile(enc(csv), "d.csv");
    const r = validateCatalog(t, suggestMapping(t.headers, "catalog"));
    expect(r.valid.map((v) => v.sku)).toEqual(["A1"]);
    expect(r.skippedDuplicates).toBe(1);
    expect(r.conflictingDuplicates).toEqual(["B2"]);
    expect(r.errors.map((e) => e.row)).toEqual([4, 5, 6, 7]);
  });

  it("saltea filas de título arriba de los encabezados (formato TOCHTER)", () => {
    const csv = "Lista de Precios\r\nCODART,DESCRIPCIO,MARCA,SUBRUBRO,PRCOSTO,PRVENTA,LINKFOTO,OBSERVAC\r\n10000TOC,AMORT,TOCHTER,AMORTIGUADORES,1,2,C:\\FOTOS\\X.JPG,\r\n";
    const t = parseImportFile(enc(csv), "t.csv");
    expect(t.headers[0]).toBe("CODART");
    expect(t.rows).toHaveLength(1);
    expect(suggestMapping(t.headers, "catalog")).toMatchObject({ sku: 0, name: 1, brand: 2, category: 3, sale_price_ars: 5, original_image_path: 6, description: 7 });
    expect(suggestMapping(t.headers, "costs")).toEqual({ sku: 0, cost_price_ars: 4 });
  });

  it("rechaza archivos vacíos, binarios y Excel antiguo", () => {
    expect(() => parseImportFile(new Uint8Array(), "a.csv")).toThrow(ImportFileError);
    expect(() =>
      parseImportFile(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]), "TOCHTER.XLS"),
    ).toThrow(/antiguo/);
    expect(() => parseImportFile(Uint8Array.from([65, 0, 66]), "a.csv")).toThrow(ImportFileError);
  });
});

describe("parseo XLSX (aunque la extensión sea .XLS)", () => {
  it("lee valores, no ejecuta fórmulas y mapea PRVENTA/PRCOSTO", () => {
    const t = parseImportFile(syntheticXlsx(), "TOCHTER.XLS");
    expect(t.format).toBe("xlsx");
    expect(t.headers).toEqual(["CODIGO", "DESCRIPCION", "RUBRO", "PRVENTA", "PRCOSTO"]);
    expect(t.rows[0]).toEqual(["10000TOC", "BOMBA SINTÉTICA & CO", "BOMBAS DE AGUA", 1.234, 0.617]);
    expect(t.rows[1]).toEqual(["10001TOC", "FILTRO SINT", null, null, null]);
    expect(t.warnings.join(" ")).toMatch(/fórmulas/);

    const mc = suggestMapping(t.headers, "catalog");
    expect(mc).toMatchObject({ sku: 0, name: 1, category: 2, sale_price_ars: 3, brand: -1 });
    expect(Object.keys(mc)).not.toContain("cost_price_ars");
    const rc = validateCatalog(t, mc);
    expect(rc.valid[0].category).toBe("Bombas de agua");
    expect(rc.valid[0].attributes).toEqual({ source_raw: { category: "BOMBAS DE AGUA" } });

    const mk = suggestMapping(t.headers, "costs");
    expect(mk).toEqual({ sku: 0, cost_price_ars: 4 });
    const k = validateCosts(t, mk);
    expect(k.valid).toEqual([{ sku: "10000TOC", cost_price_ars: 0.62 }]);
  });

  it("rechaza libros con macros", () => {
    expect(() => parseImportFile(syntheticXlsx({ withMacro: true }), "x.xlsx")).toThrow(/macros/);
  });
});
