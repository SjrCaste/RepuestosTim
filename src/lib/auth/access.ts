import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalDemo, isSupabaseConfigured } from "@/lib/env";

export interface Access {
  authenticated: boolean;
  userId?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  role?: "customer" | "admin" | "wholesale";
  status?: "pending" | "active" | "blocked";
  email_confirmed?: boolean;
  requires_approval?: boolean;
  is_admin?: boolean;
  can_view_catalog?: boolean;
}

/** Estado de acceso del usuario actual (una vez por request). */
export const getAccess = cache(async (): Promise<Access> => {
  if (!isSupabaseConfigured) return { authenticated: false };
  try {
    const supabase = await createClient();
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) return { authenticated: false };
    const { data, error: rpcError } = await supabase.rpc("my_access");
    if (rpcError || !data || !(data as Access).authenticated) {
      return {
        authenticated: true,
        userId: userData.user.id,
        email: userData.user.email,
        can_view_catalog: false,
        is_admin: false,
      };
    }
    return { ...(data as Access), userId: userData.user.id };
  } catch {
    return { authenticated: false };
  }
});

export async function requireUser(next = "/cuenta"): Promise<Access> {
  const access = await getAccess();
  if (!access.authenticated) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  return access;
}

/** Catálogo: sesión + email verificado + cuenta aprobada (o aprobación desactivada). */
export const DEMO_ACCESS: Access = {
  authenticated: true,
  full_name: "Invitado",
  can_view_catalog: true,
  is_admin: false,
  status: "active",
  role: "customer",
};

export async function requireCatalogAccess(next = "/catalogo"): Promise<Access> {
  if (isLocalDemo) return DEMO_ACCESS;
  const access = await requireUser(next);
  if (!access.can_view_catalog) redirect("/cuenta");
  return access;
}

/** Admin: cualquier otro rol recibe 404 (no se revela la existencia del panel). */
export async function requireAdmin(): Promise<Access> {
  const access = await requireUser("/admin");
  if (!access.is_admin) notFound();
  return access;
}
