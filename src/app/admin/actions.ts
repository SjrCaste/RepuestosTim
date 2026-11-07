"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/security";
import { getAccess } from "@/lib/auth/access";
import { fieldErrors, productSchema, settingsSchema, type FormState } from "@/lib/validation";
import { parseImportFile, ImportFileError, IMPORT_LIMITS } from "@/lib/import/parse";
import { fieldsFor, suggestMapping, type ColumnMapping, type ImportKind } from "@/lib/import/mapping";
import { validateCatalog, validateCosts, validateMapping, type RowIssue } from "@/lib/import/validate";
import { slugify } from "@/lib/import/normalize";

/** Autorización explícita en cada acción (además de RLS/RPC en la base). */
async function adminClient() {
  await assertSameOrigin();
  const access = await getAccess();
  if (!access.is_admin) throw new Error("No autorizado");
  return { supabase: await createClient(), access };
}

function revalidatePublic() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
export async function saveProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, access } = await adminClient();
  const id = String(fd.get("id") ?? "");
  const raw = Object.fromEntries(
    ["sku", "name", "description", "brand_id", "category_id", "sale_price_ars", "cost_price_ars", "stock_status", "stock_quantity", "compatibility"].map((k) => [
      k,
      String(fd.get(k) ?? ""),
    ]),
  );
  const parsed = productSchema.safeParse({
    ...raw,
    compatibility_verified: fd.get("compatibility_verified") ?? undefined,
    active: fd.get("active") ?? undefined,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: raw };
  const { cost_price_ars, compatibility_verified, ...data } = parsed.data;

  const prevVerified = String(fd.get("compatibility_verified_prev") ?? "") === "1";
  const row: Record<string, unknown> = { ...data, updated_by: access.userId };
  if (!data.compatibility) {
    row.compatibility_verified_at = null;
    row.compatibility_verified_by = null;
  } else if (compatibility_verified && (!prevVerified || fd.get("compatibility_changed") === "1")) {
    row.compatibility_verified_at = new Date().toISOString();
    row.compatibility_verified_by = access.userId;
  } else if (!compatibility_verified) {
    row.compatibility_verified_at = null;
    row.compatibility_verified_by = null;
  }

  let productId = id;
  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { ok: false, message: error.code === "23505" ? "Ya existe otro producto con ese SKU." : `No se pudo guardar: ${error.message}`, values: raw };
  } else {
    const { data: created, error } = await supabase.from("products").insert(row).select("id").single();
    if (error) return { ok: false, message: error.code === "23505" ? "Ya existe un producto con ese SKU." : `No se pudo crear: ${error.message}`, values: raw };
    productId = created.id;
  }
  const { error: costError } = await supabase.rpc("admin_set_product_cost", { p_product_id: productId, p_cost: cost_price_ars });
  if (costError) return { ok: false, message: `Producto guardado, pero el costo no: ${costError.message}` };

  revalidatePath("/admin/productos");
  revalidatePath("/catalogo", "layout");
  if (!id) redirect(`/admin/productos/${productId}?creado=1`);
  return { ok: true, message: "Cambios guardados." };
}

export async function setProductsActiveAction(ids: string[], active: boolean): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await adminClient();
  const parsed = z.array(z.uuid()).min(1).max(5000).safeParse(ids);
  if (!parsed.success) return { ok: false, message: "Selección inválida." };
  let done = 0;
  for (let i = 0; i < parsed.data.length; i += 500) {
    const chunk = parsed.data.slice(i, i + 500);
    const { error, count } = await supabase.from("products").update({ active }, { count: "exact" }).in("id", chunk);
    if (error) return { ok: false, message: `Error: ${error.message}` };
    done += count ?? chunk.length;
  }
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo", "layout");
  return { ok: true, message: `${done} producto(s) ${active ? "activados" : "desactivados"}.` };
}

export async function setProductImageAction(productId: string, path: string | null): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await adminClient();
  if (!z.uuid().safeParse(productId).success) return { ok: false, message: "Producto inválido" };
  if (path !== null && !/^[A-Za-z0-9._\-/]{1,200}$/.test(path)) return { ok: false, message: "Ruta inválida" };
  const { data: prev } = await supabase.from("products").select("image_path").eq("id", productId).single();
  const { error } = await supabase.from("products").update({ image_path: path }).eq("id", productId);
  if (error) return { ok: false, message: error.message };
  if (prev?.image_path && prev.image_path !== path) {
    await supabase.storage.from("product-images").remove([prev.image_path]);
  }
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo", "layout");
  return { ok: true };
}

export interface ImageIndexRow {
  id: string;
  sku: string;
  sku_norm: string;
  original_basename: string;
  has_image: boolean;
}

export async function getImageMatchIndexAction(): Promise<ImageIndexRow[]> {
  const { supabase } = await adminClient();
  const out: ImageIndexRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.rpc("admin_image_match_index").range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as ImageIndexRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function bulkSetImagesAction(pairs: { productId: string; path: string }[]): Promise<{ ok: boolean; updated: number; message?: string }> {
  const { supabase } = await adminClient();
  const parsed = z
    .array(z.object({ productId: z.uuid(), path: z.string().regex(/^[A-Za-z0-9._\-/]{1,200}$/) }))
    .max(2000)
    .safeParse(pairs);
  if (!parsed.success) return { ok: false, updated: 0, message: "Datos inválidos" };
  let updated = 0;
  for (const p of parsed.data) {
    const { error } = await supabase.from("products").update({ image_path: p.path }).eq("id", p.productId);
    if (!error) updated++;
  }
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo", "layout");
  return { ok: true, updated };
}

// ---------------------------------------------------------------------------
// Importación (el archivo se reenvía en cada paso: servidor sin estado)
// ---------------------------------------------------------------------------
export interface ImportPreview {
  ok: boolean;
  message?: string;
  filename?: string;
  format?: string;
  sheetName?: string;
  encoding?: string;
  headers?: string[];
  sample?: (string | number | boolean | null)[][];
  totalRows?: number;
  mapping?: ColumnMapping;
  warnings?: string[];
}

async function readUpload(fd: FormData) {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ImportFileError("Elegí un archivo CSV o Excel.");
  if (file.size > IMPORT_LIMITS.maxFileBytes) throw new ImportFileError("El archivo supera los 4 MB.");
  const name = file.name.slice(0, 255);
  if (!/\.(csv|txt|xlsx|xls)$/i.test(name)) throw new ImportFileError("Formato no admitido. Usá .csv, .xlsx (o .xls que en realidad sea xlsx).");
  const buf = new Uint8Array(await file.arrayBuffer());
  return { name, table: parseImportFile(buf, name) };
}

export async function previewImportAction(fd: FormData): Promise<ImportPreview> {
  await adminClient();
  const kind = (fd.get("kind") === "costs" ? "costs" : "catalog") as ImportKind;
  try {
    const { name, table } = await readUpload(fd);
    return {
      ok: true,
      filename: name,
      format: table.format,
      sheetName: table.sheetName,
      encoding: table.encoding,
      headers: table.headers,
      sample: table.rows.slice(0, 20),
      totalRows: table.rows.length,
      mapping: suggestMapping(table.headers, kind),
      warnings: table.warnings,
    };
  } catch (e) {
    return { ok: false, message: e instanceof ImportFileError ? e.message : "No se pudo leer el archivo." };
  }
}

export interface ImportValidation {
  ok: boolean;
  message?: string;
  totalRows?: number;
  validCount?: number;
  errorCount?: number;
  warningCount?: number;
  skippedDuplicates?: number;
  conflictingDuplicates?: string[];
  errors?: RowIssue[];
  warnings?: RowIssue[];
  brands?: string[];
  categories?: string[];
  newCount?: number;
  existingCount?: number;
  mappingErrors?: string[];
}

function parseMapping(fd: FormData, kind: ImportKind): ColumnMapping {
  const m: ColumnMapping = {};
  for (const f of fieldsFor(kind)) {
    const v = Number(fd.get(`map_${f.key}`));
    m[f.key] = Number.isInteger(v) ? v : -1;
  }
  return m;
}

async function existingSkus(supabase: Awaited<ReturnType<typeof createClient>>, skus: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (let i = 0; i < skus.length; i += 300) {
    const { data } = await supabase.from("products").select("sku").in("sku", skus.slice(i, i + 300));
    for (const r of data ?? []) found.add(r.sku);
  }
  return found;
}

export async function validateImportAction(fd: FormData): Promise<ImportValidation> {
  const { supabase } = await adminClient();
  const kind = (fd.get("kind") === "costs" ? "costs" : "catalog") as ImportKind;
  try {
    const { table } = await readUpload(fd);
    const mapping = parseMapping(fd, kind);
    const mErr = validateMapping(kind, mapping);
    if (mErr.length) return { ok: false, mappingErrors: mErr, message: "Revisá la asignación de columnas." };
    const report = kind === "catalog" ? validateCatalog(table, mapping) : validateCosts(table, mapping);
    const skus = report.valid.map((v) => v.sku);
    const existing = await existingSkus(supabase, skus);
    return {
      ok: true,
      totalRows: report.totalRows,
      validCount: report.valid.length,
      errorCount: report.errors.length,
      warningCount: report.warnings.length,
      skippedDuplicates: report.skippedDuplicates,
      conflictingDuplicates: report.conflictingDuplicates.slice(0, 50),
      errors: report.errors.slice(0, 300),
      warnings: report.warnings.slice(0, 300),
      brands: report.brands,
      categories: report.categories,
      newCount: skus.filter((s) => !existing.has(s)).length,
      existingCount: skus.filter((s) => existing.has(s)).length,
    };
  } catch (e) {
    return { ok: false, message: e instanceof ImportFileError ? e.message : "No se pudo validar el archivo." };
  }
}

export interface ImportOutcome {
  ok: boolean;
  message?: string;
  jobId?: string;
  created?: number;
  updated?: number;
  unchanged?: number;
  rejected?: number;
  skipped?: number;
  notFound?: string[];
  missing?: { id: string; sku: string; name: string }[];
}

export async function runImportAction(fd: FormData): Promise<ImportOutcome> {
  const { supabase } = await adminClient();
  const kind = (fd.get("kind") === "costs" ? "costs" : "catalog") as ImportKind;
  let jobId: string | undefined;
  try {
    const { name, table } = await readUpload(fd);
    const mapping = parseMapping(fd, kind);
    const mErr = validateMapping(kind, mapping);
    if (mErr.length) return { ok: false, message: mErr.join(" ") };
    const report = kind === "catalog" ? validateCatalog(table, mapping) : validateCosts(table, mapping);
    if (report.valid.length === 0) return { ok: false, message: "No hay filas válidas para importar." };

    const { data: job, error: jobErr } = await supabase.rpc("admin_import_start", {
      p_kind: kind,
      p_filename: name,
      p_total_rows: report.totalRows,
      p_error_count: report.errors.length,
      p_skipped_count: report.skippedDuplicates,
      p_errors: report.errors.slice(0, 1000),
    });
    if (jobErr) return { ok: false, message: `No se pudo iniciar la importación: ${jobErr.message}` };
    jobId = job as string;

    const totals = { created: 0, updated: 0, unchanged: 0 };
    const notFound: string[] = [];
    const chunkSize = kind === "catalog" ? 500 : 1000;
    for (let i = 0; i < report.valid.length; i += chunkSize) {
      const chunk = report.valid.slice(i, i + chunkSize);
      if (kind === "catalog") {
        const { data, error } = await supabase.rpc("admin_import_products", { p_job_id: jobId, p_fields: report.mappedFields, p_rows: chunk });
        if (error) throw new Error(error.message);
        const r = data as { created: number; updated: number; unchanged: number };
        totals.created += r.created;
        totals.updated += r.updated;
        totals.unchanged += r.unchanged;
      } else {
        const { data, error } = await supabase.rpc("admin_import_costs", { p_job_id: jobId, p_rows: chunk });
        if (error) throw new Error(error.message);
        const r = data as { updated: number; received: number; not_found: string[] };
        totals.updated += r.updated;
        totals.unchanged += r.received - r.updated - r.not_found.length;
        notFound.push(...r.not_found);
      }
    }
    await supabase.rpc("admin_import_finish", { p_job_id: jobId, p_status: "completed" });

    let missing: ImportOutcome["missing"] = [];
    if (kind === "catalog" && report.brands.length) {
      const { data } = await supabase.rpc("admin_products_missing_from", {
        p_skus: report.valid.map((v) => v.sku),
        p_brand_slugs: report.brands.map(slugify),
      });
      missing = (data ?? []) as ImportOutcome["missing"];
    }
    revalidatePath("/admin", "layout");
    revalidatePath("/catalogo", "layout");
    revalidatePublic();
    return {
      ok: true,
      jobId,
      ...totals,
      rejected: report.errors.length ? new Set(report.errors.map((e) => e.row)).size : 0,
      skipped: report.skippedDuplicates,
      notFound: notFound.slice(0, 200),
      missing,
    };
  } catch (e) {
    if (jobId) await supabase.rpc("admin_import_finish", { p_job_id: jobId, p_status: "failed" });
    return {
      ok: false,
      jobId,
      message: e instanceof ImportFileError ? e.message : `La importación falló: ${(e as Error).message}. Las tandas ya confirmadas quedaron guardadas; podés reimportar el mismo archivo sin duplicar.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------
export async function setUserStatusAction(profileId: string, status: "active" | "pending" | "blocked"): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await adminClient();
  if (!z.uuid().safeParse(profileId).success || !["active", "pending", "blocked"].includes(status)) return { ok: false, message: "Datos inválidos" };
  const { error } = await supabase.rpc("admin_set_profile_status", { p_profile_id: profileId, p_status: status });
  if (error) {
    if (/cannot_change_own_status/.test(error.message)) return { ok: false, message: "No podés cambiar tu propio estado." };
    if (/profile_not_found_or_admin/.test(error.message)) return { ok: false, message: "No se puede modificar una cuenta de administrador desde acá." };
    return { ok: false, message: error.message };
  }
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------
export async function setInquiryStatusAction(id: string, status: string, adminNotes?: string): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await adminClient();
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["new", "contacted", "closed", "cancelled"]), adminNotes: z.string().max(2000).optional() })
    .safeParse({ id, status, adminNotes });
  if (!parsed.success) return { ok: false, message: "Datos inválidos" };
  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.adminNotes !== undefined) patch.admin_notes = parsed.data.adminNotes || null;
  const { error } = await supabase.from("product_inquiries").update(patch).eq("id", parsed.data.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/consultas");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rubros y marcas
// ---------------------------------------------------------------------------
const taxonomySchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Nombre obligatorio").max(120),
  description: z.string().trim().max(500).optional(),
  sort_order: z.coerce.number().int().min(-9999).max(9999).optional(),
  active: z.string().optional().transform((v) => v === "on"),
  public_visible: z.string().optional().transform((v) => v === "on"),
});

export async function saveTaxonomyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await adminClient();
  const table = fd.get("table") === "brands" ? "brands" : "categories";
  const parsed = taxonomySchema.safeParse({
    id: fd.get("id") ?? "",
    name: fd.get("name"),
    description: fd.get("description") ?? undefined,
    sort_order: fd.get("sort_order") ?? undefined,
    active: fd.get("active") ?? undefined,
    public_visible: fd.get("public_visible") ?? undefined,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { id, name, description, sort_order, active, public_visible } = parsed.data;
  const slug = slugify(name);
  if (!slug) return { ok: false, errors: { name: "El nombre debe tener letras o números" } };
  const row: Record<string, unknown> =
    table === "brands" ? { name, active } : { name, description: description || null, sort_order: sort_order ?? 0, active, public_visible };
  if (!id) row.slug = slug;
  const q = id ? supabase.from(table).update(row).eq("id", id) : supabase.from(table).insert(row);
  const { error } = await q;
  if (error) return { ok: false, message: error.code === "23505" ? "Ya existe uno con ese nombre." : error.message };
  revalidatePath("/admin/rubros");
  revalidatePath("/catalogo", "layout");
  revalidatePublic();
  return { ok: true, message: id ? "Guardado." : "Creado." };
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, access } = await adminClient();
  const keys = ["store_name", "address", "phone_display", "whatsapp_number", "instagram_url", "maps_url", "email_public", "business_hours"];
  const raw = Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));
  const parsed = settingsSchema.safeParse({
    ...raw,
    whatsapp_confirmed: fd.get("whatsapp_confirmed") ?? undefined,
    pickup_confirmed: fd.get("pickup_confirmed") ?? undefined,
    requires_approval: fd.get("requires_approval") ?? undefined,
    prices_visible_to_customers: fd.get("prices_visible_to_customers") ?? undefined,
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), values: raw };
  const { error } = await supabase
    .from("settings")
    .update({ ...parsed.data, updated_by: access.userId })
    .eq("id", 1);
  if (error) return { ok: false, message: error.message, values: raw };
  revalidatePublic();
  return { ok: true, message: "Configuración guardada." };
}

export async function setSiteImageAction(field: "hero_image_url" | "about_image_url", url: string | null): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await adminClient();
  if (!["hero_image_url", "about_image_url"].includes(field)) return { ok: false };
  if (url !== null && !/^https?:\/\/[^\s]+\/storage\/v1\/object\/public\/site-assets\/[A-Za-z0-9._\-/]+$/.test(url)) {
    return { ok: false, message: "URL inválida" };
  }
  const { error } = await supabase.from("settings").update({ [field]: url }).eq("id", 1);
  if (error) return { ok: false, message: error.message };
  revalidatePublic();
  return { ok: true };
}
