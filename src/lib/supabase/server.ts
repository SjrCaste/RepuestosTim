import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase no está configurado (faltan NEXT_PUBLIC_SUPABASE_URL / clave pública).");
  }
}

/** Cliente con la sesión del usuario (cookies). RLS se aplica con su JWT. */
export async function createClient() {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy se encarga de refrescar la sesión.
        }
      },
    },
  });
}

/** Cliente anónimo sin cookies, para datos públicos (settings, rubros). */
export function createPublicClient() {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
  return createPlainClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
