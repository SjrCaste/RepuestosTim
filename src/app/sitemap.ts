import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/** Sólo páginas públicas. Nunca fichas del catálogo ni SKUs. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/categorias", "/como-comprar", "/nosotros", "/contacto", "/privacidad", "/terminos"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
