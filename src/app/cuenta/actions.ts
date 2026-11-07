"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security";
import { fieldErrors, profileSchema, type FormState } from "@/lib/validation";

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertSameOrigin();
  const parsed = profileSchema.safeParse({ full_name: fd.get("full_name"), phone: fd.get("phone") ?? "" });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { ok: false, message: "Tu sesión venció. Volvé a iniciar sesión." };
  // Sólo columnas permitidas por GRANT (full_name, phone). role/status no son editables.
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", u.user.id);
  if (error) return { ok: false, message: "No pudimos guardar los cambios." };
  revalidatePath("/cuenta");
  return { ok: true, message: "Datos actualizados." };
}
