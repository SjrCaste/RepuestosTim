export interface InquiryLine {
  sku: string;
  name: string;
  brand?: string | null;
  quantity: number;
}

/** Sólo dígitos, formato internacional sin "+" (ej. 5491130037581). */
export function normalizeWhatsappNumber(n: string): string {
  return n.replace(/\D/g, "");
}

function clean(s: string): string {
  return String(s)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mensaje de consulta: SKU, nombre y cantidad. Nunca incluye costos ni
 * precios (precio y disponibilidad los confirma el local).
 */
export function buildInquiryMessage(opts: {
  items: InquiryLine[];
  customerName?: string | null;
  inquiryNumber?: number | null;
  notes?: string | null;
  storeName?: string;
}): string {
  const lines: string[] = [];
  lines.push(`Hola ${opts.storeName ?? "TIM REPUESTOS"}, quiero consultar disponibilidad y precio de estos repuestos:`);
  lines.push("");
  for (const it of opts.items) {
    const qty = Math.max(1, Math.min(999, Math.floor(it.quantity)));
    lines.push(`• ${qty} x ${clean(it.name)} — SKU ${clean(it.sku)}${it.brand ? ` (${clean(it.brand)})` : ""}`);
  }
  if (opts.notes?.trim()) {
    lines.push("");
    lines.push(`Comentario: ${clean(opts.notes).slice(0, 500)}`);
  }
  lines.push("");
  const ref = [
    opts.inquiryNumber ? `Consulta #${opts.inquiryNumber}` : null,
    opts.customerName ? `a nombre de ${clean(opts.customerName)}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  if (ref) lines.push(`${ref}.`);
  lines.push("¡Gracias!");
  return lines.join("\n");
}

export function whatsappUrl(number: string, text?: string): string {
  const base = `https://wa.me/${normalizeWhatsappNumber(number)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
