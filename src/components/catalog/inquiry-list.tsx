"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, LoaderCircle, CircleCheck, ExternalLink } from "lucide-react";
import { ProductImage } from "./product-image";
import { QuantityStepper } from "./add-to-list";
import { Button, ButtonA } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Textarea, Label } from "@/components/ui/form";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { clearListAction, createInquiryAction, setListItemAction, type InquiryResult } from "@/app/catalogo/actions";
import { formatARS } from "@/lib/format";
import type { ListItem } from "@/lib/catalog";

export function InquiryList({ initialItems, pricesVisible }: { initialItems: ListItem[]; pricesVisible: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InquiryResult | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const update = (id: string, qty: number) => {
    const prev = items;
    setItems((list) => (qty === 0 ? list.filter((i) => i.product_id !== id) : list.map((i) => (i.product_id === id ? { ...i, quantity: qty } : i))));
    setBusyId(id);
    start(async () => {
      const r = await setListItemAction(id, qty, "set");
      setBusyId(null);
      if (!r.ok) {
        setItems(prev);
        setError(r.message ?? "Error");
      } else setError(null);
    });
  };

  const send = () =>
    start(async () => {
      setError(null);
      const r = await createInquiryAction(notes);
      setResult(r);
      if (r.ok) {
        setItems([]);
        // Intento de abrir WhatsApp; si el navegador lo bloquea queda el botón.
        window.open(r.whatsappUrl, "_blank", "noopener,noreferrer");
      }
    });

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-brand-ink/25 bg-white p-6 sm:p-8" role="status">
        <CircleCheck className="size-10 text-brand-ink" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold">{result.number ? `Consulta #${result.number} registrada` : "Consulta lista para enviar"}</h2>
        <p className="mt-2 text-[15px] leading-7 text-muted">
          Si WhatsApp no se abrió automáticamente, tocá el botón para enviar el mensaje. El local te va a responder con precio y disponibilidad.
        </p>
        <pre className="mt-5 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 font-sans text-sm leading-6 text-carbon">
          {result.message}
        </pre>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonA href={result.whatsappUrl} target="_blank" rel="noopener noreferrer" size="lg">
            <WhatsAppIcon /> Abrir WhatsApp
          </ButtonA>
          <Button variant="outline" size="lg" onClick={() => (window.location.href = "/catalogo")}>
            Seguir buscando
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
        <h2 className="text-lg font-semibold">Tu lista está vacía</h2>
        <p className="mt-1.5 text-[15px] text-muted">Buscá repuestos en el catálogo y agregalos con la cantidad que necesitás.</p>
        <Link href="/catalogo" className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand px-5 font-semibold text-graphite hover:bg-brand-hover">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div>
        {error ? (
          <Alert tone="bad" live className="mb-4">
            {error}
          </Alert>
        ) : null}
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {items.map((it) => (
            <li key={it.product_id} className="flex gap-4 p-4">
              <Link href={`/catalogo/${encodeURIComponent(it.sku)}`} className="shrink-0 overflow-hidden rounded-lg border border-line" tabIndex={-1} aria-hidden>
                <ProductImage src={it.image_url} alt="" className="size-20 sm:size-24" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-semibold text-muted">SKU {it.sku}</p>
                <Link href={`/catalogo/${encodeURIComponent(it.sku)}`} className="mt-0.5 line-clamp-2 font-semibold [overflow-wrap:anywhere] hover:text-brand-ink hover:underline">
                  {it.name}
                </Link>
                {it.brand_name ? <p className="text-[13px] text-muted">{it.brand_name}</p> : null}
                {!it.available ? <p className="mt-1 text-[13px] font-medium text-warn">Ya no figura en el catálogo: no se incluirá en la consulta.</p> : null}
                {pricesVisible && it.sale_price_ars !== null ? (
                  <p className="mt-1 text-sm font-semibold tabular-nums">{formatARS(it.sale_price_ars)} c/u</p>
                ) : null}
                <div className="mt-3 flex items-center gap-2">
                  <QuantityStepper value={it.quantity} onChange={(n) => update(it.product_id, n)} disabled={busyId === it.product_id} label={`Cantidad de ${it.name}`} size="sm" />
                  <Button variant="ghost" size="sm" onClick={() => update(it.product_id, 0)} disabled={busyId === it.product_id} aria-label={`Quitar ${it.name}`}>
                    <Trash2 aria-hidden /> <span className="hidden sm:inline">Quitar</span>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            start(async () => {
              if (!window.confirm("¿Vaciar toda la lista?")) return;
              const r = await clearListAction();
              if (r.ok) setItems([]);
              else setError(r.message ?? "Error");
            })
          }
          className="mt-3 text-sm font-semibold text-muted underline hover:text-danger"
        >
          Vaciar lista
        </button>
      </div>

      <aside className="rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-24" aria-labelledby="resumen">
        <h2 id="resumen" className="text-lg font-semibold">
          Resumen
        </h2>
        <dl className="mt-3 space-y-1.5 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Productos</dt>
            <dd className="font-semibold tabular-nums">{items.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Unidades</dt>
            <dd className="font-semibold tabular-nums">{totalUnits}</dd>
          </div>
        </dl>
        <div className="mt-5 grid gap-1.5">
          <Label htmlFor="notes">
            Comentario <span className="font-normal text-muted">(opcional)</span>
          </Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Ej.: vehículo, año, motor…" />
        </div>
        {result && !result.ok ? (
          <Alert tone="warn" live className="mt-4">
            {result.message}
            {result.fallbackUrl ? (
              <a href={result.fallbackUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 font-semibold underline">
                Enviar por WhatsApp igualmente <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </Alert>
        ) : null}
        <Button size="lg" className="mt-5 w-full" onClick={send} disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <WhatsAppIcon />}
          Consultar estos repuestos
        </Button>
        <p className="mt-3 text-[13px] leading-5 text-muted">
          Registramos tu consulta y se abre WhatsApp con los códigos, nombres y cantidades. No es una compra: el local confirma precio y disponibilidad.
        </p>
      </aside>
    </div>
  );
}
