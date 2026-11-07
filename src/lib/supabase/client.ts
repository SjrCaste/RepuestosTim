"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Cliente del navegador (clave pública). Lo usa el admin para subir imágenes directo a Storage. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
  );
}
