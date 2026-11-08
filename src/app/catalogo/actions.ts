"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security";
import { getAccess } from "@/lib/auth/access";
import { getSettings } from "@/lib/settings";
import { buildInquiryMessage, whatsappUrl, type InquiryLine } from "@/lib/whatsapp";
import { cookies } from "next/headers";
import { isLocalDemo } from "@/lib/env";
import { demoProduct } from "@/lib/demo-catalog";
import { DEMO_LIST_COOKIE, getInquiryList, readDemoList } from "@/lib/catalog";

export type ListActionResult = { ok: boolean; quantity?: number; message?: string };

const setSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(0).max(999),
  mode: z.enum(["set", "add"]),
});

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "PT429" || /rate_limited/.test(error.message)) return "Demasiadas acciones seguidas. Esperá un momento.";
  if (/list_full/.test(error.message)) return "Tu lista llegó al máximo de 100 productos.";
  if (/product_not_found/.test(error.message)) return "Este producto ya no está disponible en el catálogo.";
  if (error.code === "42501" || /not_authorized/.test(error.message)) return "Tu cuenta no tiene acceso al catálogo.";
  return "No pudimos actualizar la lista. Intentá de nuevo.";
}

async function writeDemoList(list: Record<string, number>) {
  (await cookies()).set(DEMO_LIST_COOKIE, JSON.stringify(list), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function setListItemAction(productId: string, quantity: number, mode: "set" | "add" = "set"): Promise<ListActionResult> {
  await assertSameOrigin();
  if (isLocalDemo) {
    const p = demoProduct(String(productId));
    if (!p) return { ok: false, message: "Este producto no está en el catálogo." };
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) return { ok: false, message: "Cantidad inválida (1 a 999)." };
    const list = await readDemoList();
    if (quantity === 0) delete list[p.sku];
    else {
      if (!list[p.sku] && Object.keys(list).length >= 100) return { ok: false, message: "Tu lista llegó al máximo de 100 productos." };
      list[p.sku] = Math.min(999, mode === "add" ? (list[p.sku] ?? 0) + quantity : quantity);
    }
    await writeDemoList(list);
    revalidatePath("/catalogo", "layout");
    return { ok: true, quantity: list[p.sku] ?? 0 };
  }
  const parsed = setSchema.safeParse({ productId, quantity, mode });
  if (!parsed.success) return { ok: false, message: "Cantidad inválida (1 a 999)." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inquiry_list_set", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_mode: parsed.data.mode,
  });
  if (error) return { ok: false, message: friendly(error) };
  revalidatePath("/catalogo", "layout");
  return { ok: true, quantity: data as number };
}

export async function clearListAction(): Promise<ListActionResult> {
  await assertSameOrigin();
  if (isLocalDemo) {
    await writeDemoList({});
    revalidatePath("/catalogo", "layout");
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("inquiry_list_clear");
  if (error) return { ok: false, message: friendly(error) };
  revalidatePath("/catalogo", "layout");
  return { ok: true };
}

export type InquiryResult =
  | { ok: true; number: number; whatsappUrl: string; message: string }
  | { ok: false; message: string; fallbackUrl?: string };

/**
 * 1) Registra la consulta en la base (los datos salen de la lista guardada en
 *    el servidor, no del navegador). 2) Devuelve el enlace de WhatsApp.
 * Si el registro falla, devuelve un enlace de respaldo armado con la lista
 * actual para que el cliente igual pueda consultar.
 */
export async function createInquiryAction(notes: string): Promise<InquiryResult> {
  await assertSameOrigin();
  const cleanNotes = String(notes ?? "").slice(0, 1000);
  if (isLocalDemo) {
    // Demo: no hay base para registrar la consulta; se arma el mensaje igual.
    const [items, settings] = await Promise.all([getInquiryList(), getSettings()]);
    if (!items.length) return { ok: false, message: "Tu lista está vacía." };
    const message = buildInquiryMessage({
      items: items.map((i) => ({ sku: i.sku, name: i.name, brand: i.brand_name, quantity: i.quantity })),
      notes: cleanNotes,
      storeName: settings.store_name,
    });
    await writeDemoList({});
    revalidatePath("/catalogo", "layout");
    return { ok: true, number: 0, whatsappUrl: whatsappUrl(settings.whatsapp_number, message), message };
  }
  const [supabase, settings, access] = await Promise.all([createClient(), getSettings(), getAccess()]);
  const { data, error } = await supabase.rpc("inquiry_create", { p_notes: cleanNotes || null });

  if (error) {
    if (/empty_list/.test(error.message)) return { ok: false, message: "Tu lista está vacía." };
    let fallbackUrl: string | undefined;
    const { data: list } = await supabase.rpc("inquiry_list_get");
    const items = ((list ?? []) as { sku: string; name: string; brand_name: string | null; quantity: number }[]).map((i) => ({
      sku: i.sku,
      name: i.name,
      brand: i.brand_name,
      quantity: i.quantity,
    }));
    if (items.length) {
      fallbackUrl = whatsappUrl(
        settings.whatsapp_number,
        buildInquiryMessage({ items, notes: cleanNotes, customerName: access.full_name, storeName: settings.store_name }),
      );
    }
    return {
      ok: false,
      message:
        error.code === "PT429" || /rate_limited/.test(error.message)
          ? "Enviaste varias consultas en poco tiempo, así que no pudimos registrar esta. Igual podés mandarla por WhatsApp."
          : "No pudimos registrar la consulta en el sistema. Igual podés enviarla por WhatsApp.",
      fallbackUrl,
    };
  }

  const res = data as { number: number; items: InquiryLine[] };
  const message = buildInquiryMessage({
    items: res.items,
    notes: cleanNotes,
    inquiryNumber: res.number,
    customerName: access.full_name,
    storeName: settings.store_name,
  });
  revalidatePath("/catalogo", "layout");
  revalidatePath("/cuenta");
  return { ok: true, number: res.number, whatsappUrl: whatsappUrl(settings.whatsapp_number, message), message };
}
