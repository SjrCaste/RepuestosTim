import { describe, expect, it } from "vitest";
import { buildInquiryMessage, whatsappUrl } from "@/lib/whatsapp";
import { safeNext } from "@/lib/safe-next";

describe("mensaje de WhatsApp", () => {
  it("incluye cantidad, nombre y SKU; sin precios ni costos", () => {
    const msg = buildInquiryMessage({
      items: [
        { sku: "10000TOC", name: "BOMBA DE AGUA", brand: "TOCHTER", quantity: 2 },
        { sku: "10001TOC", name: "TENSOR", quantity: 1 },
      ],
      inquiryNumber: 15,
      customerName: "Juan Pérez",
      notes: "Gol 1.6 2010",
    });
    expect(msg).toContain("• 2 x BOMBA DE AGUA — SKU 10000TOC (TOCHTER)");
    expect(msg).toContain("• 1 x TENSOR — SKU 10001TOC");
    expect(msg).toContain("Consulta #15 a nombre de Juan Pérez.");
    expect(msg).toContain("Comentario: Gol 1.6 2010");
    expect(msg).not.toMatch(/\$|precio de costo|costo/i);
  });

  it("arma el enlace universal wa.me con el texto codificado", () => {
    const url = whatsappUrl("+54 9 11 3003-7581", "2 x BOMBA & CO — SKU 10000TOC");
    expect(url.startsWith("https://wa.me/5491130037581?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("2 x BOMBA & CO — SKU 10000TOC");
  });

  it("limita cantidades a 1..999", () => {
    const msg = buildInquiryMessage({ items: [{ sku: "A", name: "B", quantity: 5000 }] });
    expect(msg).toContain("• 999 x B");
  });
});

describe("redirección segura post-login", () => {
  it("conserva la búsqueda interna", () => {
    expect(safeNext("/catalogo?q=10000TOC")).toBe("/catalogo?q=10000TOC");
  });
  it("rechaza destinos externos o raros", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "/auth/confirm", "", null, "/ok\r\nSet-Cookie:x"]) {
      expect(safeNext(bad)).toBe("/catalogo");
    }
  });
});
