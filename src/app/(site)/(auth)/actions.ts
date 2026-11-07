"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { assertSameOrigin, clientIp, hashKey, rateLimit, safeNext } from "@/lib/security";
import { fieldErrors, forgotSchema, resetSchema, signInSchema, signUpSchema, type FormState } from "@/lib/validation";
import { PRIVACY_POLICY_VERSION } from "@/config/site";

const NOT_CONFIGURED: FormState = {
  ok: false,
  message: "El sistema de cuentas todavía no está conectado (falta configurar Supabase). Probá más tarde o consultanos por WhatsApp.",
};
const TOO_MANY: FormState = { ok: false, message: "Demasiados intentos. Esperá unos minutos y volvé a intentar." };

function values(fd: FormData, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));
}

export async function signInAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  const kept = values(fd, ["email"]);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: kept };
  if (!isSupabaseConfigured) return { ...NOT_CONFIGURED, values: kept };

  const ip = await clientIp();
  const okIp = await rateLimit(`login:ip:${ip}`, 30, 600);
  const okEmail = await rateLimit(`login:email:${await hashKey(parsed.data.email)}`, 8, 600);
  if (!okIp || !okEmail) return { ...TOO_MANY, values: kept };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        ok: false,
        message: "Todavía no confirmaste tu email. Revisá tu correo (y la carpeta de spam) o pedí un nuevo enlace.",
        values: { ...kept, unconfirmed: "1" },
      };
    }
    if (error.status === 429) return { ...TOO_MANY, values: kept };
    return { ok: false, message: "Email o contraseña incorrectos.", values: kept };
  }
  redirect(safeNext(fd.get("next"), "/catalogo"));
}

export async function signUpAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertSameOrigin();
  const raw = values(fd, ["full_name", "email", "phone", "password", "password_confirm", "privacy", "website"]);
  const kept = { full_name: raw.full_name, email: raw.email, phone: raw.phone };
  const parsed = signUpSchema.safeParse({ ...raw, privacy: fd.get("privacy") ?? undefined });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: kept };
  if (!isSupabaseConfigured) return { ...NOT_CONFIGURED, values: kept };

  const ip = await clientIp();
  if (!(await rateLimit(`signup:ip:${ip}`, 6, 3600))) return { ...TOO_MANY, values: kept };

  const supabase = await createClient();
  const next = safeNext(fd.get("next"), "/catalogo");
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
      // Sólo datos de perfil. El rol NUNCA se toma de acá (lo fija el trigger en la base).
      data: {
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? null,
        privacy_accepted: "true",
        privacy_version: PRIVACY_POLICY_VERSION,
      },
    },
  });
  if (error) {
    if (error.code === "weak_password") return { ok: false, errors: { password: "La contraseña es demasiado débil o conocida. Elegí otra." }, values: kept };
    if (error.status === 429 || error.code === "over_email_send_rate_limit") return { ...TOO_MANY, values: kept };
    if (error.code !== "user_already_exists") {
      console.error("[signup]", error.code, error.message);
      return { ok: false, message: "No pudimos crear la cuenta. Intentá nuevamente en unos minutos.", values: kept };
    }
  }
  // Mensaje genérico: no revela si el email ya estaba registrado.
  redirect("/verificar");
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = forgotSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: values(fd, ["email"]) };
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const ip = await clientIp();
  const ok = (await rateLimit(`forgot:ip:${ip}`, 10, 3600)) && (await rateLimit(`forgot:email:${await hashKey(parsed.data.email)}`, 3, 3600));
  if (ok) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/confirm?next=/restablecer`,
    });
    if (error && error.status !== 429) console.error("[forgot]", error.code, error.message);
  }
  return { ok: true, message: "Si el email corresponde a una cuenta, te enviamos un enlace para restablecer la contraseña. Revisá también la carpeta de spam." };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertSameOrigin();
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = resetSchema.safeParse({ password: fd.get("password"), password_confirm: fd.get("password_confirm") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "El enlace venció o ya fue usado. Pedí uno nuevo desde “Olvidé mi contraseña”." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { ok: false, errors: { password: "Elegí una contraseña distinta a la anterior." } };
    if (error.code === "weak_password") return { ok: false, errors: { password: "La contraseña es demasiado débil o conocida. Elegí otra." } };
    return { ok: false, message: "No pudimos actualizar la contraseña. Pedí un nuevo enlace e intentá otra vez." };
  }
  redirect("/cuenta?mensaje=contrasena-actualizada");
}

export async function resendVerificationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertSameOrigin();
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = forgotSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const ok = await rateLimit(`resend:email:${await hashKey(parsed.data.email)}`, 3, 3600);
  if (ok) {
    const supabase = await createClient();
    await supabase.auth.resend({
      type: "signup",
      email: parsed.data.email,
      options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=/catalogo` },
    });
  }
  return { ok: true, message: "Si la cuenta existe y no está confirmada, te reenviamos el enlace." };
}

export async function signOutAction(): Promise<void> {
  await assertSameOrigin();
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
