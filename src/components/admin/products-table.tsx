"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ImageOff, Image as ImageIcon } from "lucide-react";
import { Badge, Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { setProductsActiveAction } from "@/app/admin/actions";
import { formatARS, STOCK_LABELS } from "@/lib/format";

export interface AdminProductRow {
  id: string;
  sku: string;
  name: string;
  active: boolean;
  sale_price_ars: number | null;
  stock_status: string;
  image_path: string | null;
  brands: { name: string } | null;
  categories: { name: string } | null;
}

export function ProductsTable({ rows }: { rows: AdminProductRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulk = (active: boolean) => {
    const ids = [...selected];
    if (!window.confirm(`¿${active ? "Activar" : "Desactivar"} ${ids.length} producto(s)? ${active ? "" : "Dejarán de verse en el catálogo (no se borran)."}`)) return;
    start(async () => {
      const r = await setProductsActiveAction(ids, active);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) setSelected(new Set());
    });
  };

  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">No hay productos con estos filtros.</p>;

  return (
    <div className="grid gap-3">
      {msg ? (
        <Alert tone={msg.ok ? "ok" : "bad"} live>
          {msg.text}
        </Alert>
      ) : null}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3" role="region" aria-label="Acciones en lote">
          <span className="text-sm font-semibold">{selected.size} seleccionado(s)</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => bulk(true)}>
            Activar
          </Button>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => bulk(false)}>
            Desactivar
          </Button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-[13px] text-muted">
            <tr>
              <th scope="col" className="w-10 px-3 py-2.5">
                <input type="checkbox" aria-label="Seleccionar todos" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} className="size-4 accent-brand-ink" />
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">SKU</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Nombre</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Rubro</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Precio venta</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Estado</th>
              <th scope="col" className="px-3 py-2.5 font-semibold"><span className="sr-only">Imagen</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const stock = STOCK_LABELS[r.stock_status];
              return (
                <tr key={r.id} className={r.active ? "" : "bg-paper/70 text-muted"}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" aria-label={`Seleccionar ${r.sku}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-brand-ink" />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[13px] font-semibold">
                    <Link href={`/admin/productos/${r.id}`} className="text-brand-ink hover:underline">
                      {r.sku}
                    </Link>
                  </td>
                  <td className="max-w-[320px] px-3 py-2.5">
                    <span className="line-clamp-2">{r.name}</span>
                    {r.brands?.name ? <span className="text-xs text-muted">{r.brands.name}</span> : null}
                  </td>
                  <td className="px-3 py-2.5">{r.categories?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatARS(r.sale_price_ars) ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={r.active ? "ok" : "neutral"}>{r.active ? "Activo" : "Inactivo"}</Badge>
                      {stock ? <Badge tone={stock.tone}>{stock.label}</Badge> : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {r.image_path ? (
                      <ImageIcon className="size-4 text-brand-ink" aria-label="Con imagen" />
                    ) : (
                      <ImageOff className="size-4 text-muted" aria-label="Sin imagen" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
