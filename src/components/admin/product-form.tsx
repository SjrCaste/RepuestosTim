"use client";
import { useActionState, useState } from "react";
import { Lock } from "lucide-react";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveProductAction } from "@/app/admin/actions";
import { STOCK_OPTIONS } from "@/lib/format";

export interface ProductFormData {
  id?: string;
  sku?: string;
  name?: string;
  description?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  sale_price_ars?: number | null;
  cost_price_ars?: number | null;
  stock_status?: string;
  stock_quantity?: number | null;
  compatibility?: string | null;
  compatibility_verified?: boolean;
  active?: boolean;
  original_image_path?: string | null;
}

export function ProductForm({
  product,
  brands,
  categories,
  created,
}: {
  product: ProductFormData;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  created?: boolean;
}) {
  const [state, action] = useActionState(saveProductAction, created ? { ok: true, message: "Producto creado." } : {});
  const [compat, setCompat] = useState(product.compatibility ?? "");
  const v = (k: keyof ProductFormData) => state.values?.[k] ?? (product[k] === null || product[k] === undefined ? "" : String(product[k]));
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="id" value={product.id ?? ""} />
      <input type="hidden" name="compatibility_verified_prev" value={product.compatibility_verified ? "1" : "0"} />
      <input type="hidden" name="compatibility_changed" value={compat !== (product.compatibility ?? "") ? "1" : "0"} />
      {state.message ? (
        <Alert tone={state.ok ? "ok" : "bad"} live>
          {state.message}
        </Alert>
      ) : null}

      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="SKU / código" required error={state.errors?.sku}>
          {(p) => <Input {...p} name="sku" defaultValue={v("sku")} maxLength={64} className="font-mono uppercase" />}
        </Field>
        <Field label="Estado de stock" hint="“Sin información” no muestra nada al cliente." error={state.errors?.stock_status}>
          {(p) => (
            <Select {...p} name="stock_status" defaultValue={v("stock_status") || "unknown"}>
              {STOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Nombre" required error={state.errors?.name} className="sm:col-span-2">
          {(p) => <Input {...p} name="name" defaultValue={v("name")} maxLength={300} />}
        </Field>
        <Field label="Marca" error={state.errors?.brand_id}>
          {(p) => (
            <Select {...p} name="brand_id" defaultValue={v("brand_id")}>
              <option value="">Sin marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Categoría" error={state.errors?.category_id}>
          {(p) => (
            <Select {...p} name="category_id" defaultValue={v("category_id")}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Descripción" error={state.errors?.description} className="sm:col-span-2">
          {(p) => <Textarea {...p} name="description" defaultValue={v("description")} maxLength={4000} rows={4} />}
        </Field>
      </Card>

      <Card className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Precio de venta (ARS)" hint="Visible sólo si se activan los precios." error={state.errors?.sale_price_ars}>
          {(p) => <Input {...p} name="sale_price_ars" inputMode="decimal" defaultValue={v("sale_price_ars")} placeholder="Ej.: 12345,50" />}
        </Field>
        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden /> Costo (privado)
            </span>
          }
          hint="Sólo administradores. Nunca se envía a clientes."
          error={state.errors?.cost_price_ars}
        >
          {(p) => <Input {...p} name="cost_price_ars" inputMode="decimal" defaultValue={v("cost_price_ars")} />}
        </Field>
        <Field label="Cantidad en stock" hint="Sólo si hay un dato real. Uso interno." error={state.errors?.stock_quantity}>
          {(p) => <Input {...p} name="stock_quantity" inputMode="numeric" defaultValue={v("stock_quantity")} />}
        </Field>
      </Card>

      <Card className="grid gap-3 p-5">
        <Field
          label="Compatibilidad vehicular"
          hint="Completar sólo con información verificada. No se infiere de la descripción."
          error={state.errors?.compatibility}
        >
          {(p) => <Textarea {...p} name="compatibility" value={compat} onChange={(e) => setCompat(e.target.value)} maxLength={4000} rows={3} />}
        </Field>
        <label className="flex gap-3 text-sm">
          <Checkbox name="compatibility_verified" defaultChecked={product.compatibility_verified} />
          <span>
            <strong>Verificada por el local.</strong> Sólo si está marcada, la compatibilidad se muestra a los clientes.
          </span>
        </label>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <label className="flex gap-3 text-sm">
          <Checkbox name="active" defaultChecked={product.active ?? true} />
          <span>
            <strong>Activo</strong> (visible en el catálogo)
          </span>
        </label>
        {product.original_image_path ? (
          <p className="text-[13px] text-muted">
            Imagen de origen: <span className="font-mono">{product.original_image_path}</span>
          </p>
        ) : null}
        <SubmitButton size="lg" pendingText="Guardando…">
          {product.id ? "Guardar cambios" : "Crear producto"}
        </SubmitButton>
      </Card>
    </form>
  );
}
