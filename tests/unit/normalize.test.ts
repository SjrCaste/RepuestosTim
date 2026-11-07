import { describe, expect, it } from "vitest";
import {
  cleanText,
  displayCategoryName,
  fixMojibake,
  normalizeSearch,
  normalizeSkuKey,
  parseBool,
  parsePrice,
  slugify,
  fileBasename,
} from "@/lib/import/normalize";

describe("normalización", () => {
  it("limpia espacios, caracteres de control y BOM", () => {
    expect(cleanText("  BOMBA\u0000  DE\tAGUA \uFEFF")).toBe("BOMBA DE AGUA");
  });
  it("repara mojibake UTF-8 leído como Latin-1", () => {
    expect(fixMojibake("PIÃ‘ON")).toBe("PIÃ‘ON"); // ‘ > 0xFF: no es reparable con seguridad, se deja
    expect(fixMojibake("Ã¡ngulo")).toBe("ángulo");
    expect(fixMojibake("PIÃ\u0091ON")).toBe("PIÑON");
    expect(fixMojibake("ángulo")).toBe("ángulo");
  });
  it("búsqueda insensible a acentos y mayúsculas", () => {
    expect(normalizeSearch("Ángulo  DE Dirección")).toBe("angulo de direccion");
  });
  it("normaliza clave de SKU", () => {
    expect(normalizeSkuKey("10000-toc")).toBe("10000TOC");
    expect(normalizeSkuKey(" 10.000 TOC ")).toBe("10000TOC");
  });
  it("slug igual que SQL", () => {
    expect(slugify("Bombas de Agua / Ñandú")).toBe("bombas-de-agua-nandu");
  });
  it("rubro en mayúsculas → oración; texto mixto se respeta", () => {
    expect(displayCategoryName("BOMBAS DE AGUA")).toBe("Bombas de agua");
    expect(displayCategoryName("Kits VW")).toBe("Kits VW");
  });
  it("precios en formato argentino e internacional", () => {
    const v = (x: unknown) => {
      const r = parsePrice(x);
      return r.ok ? r.value : "ERR";
    };
    expect(v("$ 12.345,67")).toBe(12345.67);
    expect(v("12345.67")).toBe(12345.67);
    expect(v("12.345")).toBe(12345);
    expect(v("1.234.567")).toBe(1234567);
    expect(v("12,5")).toBe(12.5);
    expect(v("1,234,567")).toBe(1234567);
    expect(v(1.234)).toBe(1.23);
    expect(v("")).toBe(null);
    expect(v(null)).toBe(null);
    expect(v("-5")).toBe("ERR");
    expect(v("abc")).toBe("ERR");
    expect(v("=1+1")).toBe("ERR");
  });
  it("booleanos", () => {
    expect(parseBool("verdadero")).toEqual({ ok: true, value: true });
    expect(parseBool("FALSO")).toEqual({ ok: true, value: false });
    expect(parseBool("")).toEqual({ ok: true, value: true });
    expect(parseBool("quizás").ok).toBe(false);
  });
  it("basename de ruta Windows", () => {
    expect(fileBasename("C:\\FOTOS\\TOCHTER\\10000TOC.JPG")).toBe("10000TOC.JPG");
  });
});
