/** Sólo rutas internas: evita redirecciones abiertas (?next=https://otro-sitio). */
export function safeNext(next: unknown, fallback = "/catalogo"): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n\t]/.test(next) || next.includes("\\")) return fallback;
  if (next.startsWith("/auth/") || next === "/ingresar" || next.startsWith("/ingresar?")) return fallback;
  return next.slice(0, 500);
}
