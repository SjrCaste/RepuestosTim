import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { isSupabaseConfigured } from "@/lib/env";

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Destino de los enlaces de email (confirmación de cuenta y recuperación).
 * Soporta token_hash (recomendado: funciona aunque el mail se abra en otro
 * dispositivo) y code (PKCE).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  let next = safeNext(url.searchParams.get("next"), "/catalogo");
  if (type === "recovery") next = "/restablecer";

  const fail = () => {
    const to = new URL("/ingresar", url.origin);
    to.searchParams.set("error", "enlace");
    return NextResponse.redirect(to);
  };
  if (!isSupabaseConfigured) return fail();

  const supabase = await createClient();
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail();
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
  } else {
    return fail();
  }
  const res = NextResponse.redirect(new URL(next, url.origin));
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
