const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });

export function formatARS(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? ars.format(n) : null;
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}

export type Tone = "neutral" | "ok" | "warn" | "bad" | "info";

export const STOCK_LABELS: Record<string, { label: string; tone: Tone } | undefined> = {
  unknown: undefined, // sin información real: no se muestra nada
  available: { label: "Disponible", tone: "ok" },
  on_request: { label: "A pedido", tone: "warn" },
  out_of_stock: { label: "Sin stock", tone: "bad" },
};

export const STOCK_OPTIONS = [
  { value: "unknown", label: "Sin información (no se muestra)" },
  { value: "available", label: "Disponible" },
  { value: "on_request", label: "A pedido" },
  { value: "out_of_stock", label: "Sin stock" },
] as const;
