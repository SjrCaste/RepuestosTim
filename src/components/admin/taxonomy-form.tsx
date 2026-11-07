"use client";
import { useActionState } from "react";
import { saveTaxonomyAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/form";

export interface TaxonomyRow {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  sort_order?: number;
  active?: boolean;
  public_visible?: boolean;
  source_name?: string | null;
  product_count?: number;
}

export function TaxonomyForm({ table, row }: { table: "categories" | "brands"; row: TaxonomyRow }) {
  const [state, action] = useActionState(saveTaxonomyAction, {});
  const isCat = table === "categories";
  const uid = row.id ?? `new-${table}`;
  return (
    <form action={action} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
      <input type="hidden" name="table" value={table} />
      <input type="hidden" name="id" value={row.id ?? ""} />
      <div className={`grid gap-2 ${isCat ? "md:grid-cols-[1.2fr_1.5fr_80px]" : ""}`}>
        <div>
          <label htmlFor={`${uid}-name`} className="sr-only">
            Nombre
          </label>
          <Input id={`${uid}-name`} name="name" defaultValue={row.name} placeholder={row.id ? "" : isCat ? "Nuevo rubro" : "Nueva marca"} className="h-10" required maxLength={120} />
          {row.source_name && row.source_name !== row.name ? <p className="mt-1 text-xs text-muted">Original: {row.source_name}</p> : null}
          {row.product_count !== undefined ? <p className="mt-1 text-xs text-muted">{row.product_count} producto(s)</p> : null}
        </div>
        {isCat ? (
          <>
            <div>
              <label htmlFor={`${uid}-desc`} className="sr-only">
                Descripción pública
              </label>
              <Input id={`${uid}-desc`} name="description" defaultValue={row.description ?? ""} placeholder="Descripción pública (opcional)" className="h-10" maxLength={500} />
            </div>
            <div>
              <label htmlFor={`${uid}-order`} className="sr-only">
                Orden
              </label>
              <Input id={`${uid}-order`} name="sort_order" type="number" defaultValue={row.sort_order ?? 0} className="h-10" title="Orden" />
            </div>
          </>
        ) : null}
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={row.active ?? true} className="size-4 accent-brand-ink" /> Activo
          </label>
          {isCat ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" name="public_visible" defaultChecked={row.public_visible ?? true} className="size-4 accent-brand-ink" /> Visible en la home
            </label>
          ) : null}
        </div>
        {state.message || state.errors?.name ? (
          <p role="status" className={`text-[13px] font-medium ${state.ok ? "text-brand-ink" : "text-danger"}`}>
            {state.message ?? state.errors?.name}
          </p>
        ) : null}
      </div>
      <SubmitButton size="sm" variant={row.id ? "outline" : "dark"} pendingText="…">
        {row.id ? "Guardar" : "Agregar"}
      </SubmitButton>
    </form>
  );
}
