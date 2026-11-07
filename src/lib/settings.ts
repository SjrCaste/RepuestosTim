import "server-only";
import { cache } from "react";
import { SITE_DEFAULTS, type SiteSettings } from "@/config/site";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export type LoadedSettings = SiteSettings & { source: "db" | "defaults" };

/** Configuración pública del local. Si la base no responde, usa los valores por defecto. */
export const getSettings = cache(async (): Promise<LoadedSettings> => {
  if (!isSupabaseConfigured) return { ...SITE_DEFAULTS, source: "defaults" };
  try {
    const { data, error } = await createPublicClient().from("settings").select("*").eq("id", 1).single();
    if (error || !data) throw error ?? new Error("sin datos");
    const merged: Record<string, unknown> = { ...SITE_DEFAULTS };
    for (const k of Object.keys(SITE_DEFAULTS)) {
      if (k in data) merged[k] = (data as Record<string, unknown>)[k];
    }
    return { ...(merged as SiteSettings), source: "db" };
  } catch {
    return { ...SITE_DEFAULTS, source: "defaults" };
  }
});

export interface PublicCategory {
  name: string;
  slug: string;
  description: string | null;
}

/** Rubros públicos: sólo nombre y descripción (sin SKU, precios ni cantidades). */
export const getPublicCategories = cache(async (): Promise<PublicCategory[]> => {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await createPublicClient()
      .from("categories")
      .select("name, slug, description")
      .eq("active", true)
      .eq("public_visible", true)
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
});
