import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

export { safeNext } from "@/lib/safe-next";

/** CSRF: además del chequeo de Next.js, exige Origin presente y del mismo host. */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) throw new Error("Solicitud rechazada (origen ausente).");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Solicitud rechazada (origen inválido).");
  }
  if (originHost !== host) throw new Error("Solicitud rechazada (origen distinto).");
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0, 64);
}

/**
 * Rate limit del servidor (login/registro/recuperación), persistido en Postgres
 * vía RPC sólo-service_role. Supabase Auth aplica además sus propios límites.
 * Si la clave de servicio no está configurada no bloquea (y lo registra).
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const service = createServiceClient();
  if (!service) {
    if (process.env.NODE_ENV === "production") console.warn("[rate-limit] SUPABASE_SERVICE_ROLE_KEY no configurada");
    return true;
  }
  const { data, error } = await service.rpc("rate_limit_check", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}

export async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.toLowerCase().trim()));
  return Buffer.from(digest).toString("hex").slice(0, 32);
}
