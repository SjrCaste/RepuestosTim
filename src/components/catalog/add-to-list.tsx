"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Minus, Plus, ListPlus, Check, LoaderCircle } from "lucide-react";
import { setListItemAction } from "@/app/catalogo/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  disabled,
  label,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  label: string;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-9" : "h-11";
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-line bg-white", h)} role="group" aria-label={label}>
      <button
        type="button"
        className="grid h-full w-9 place-items-center rounded-l-lg text-carbon hover:bg-paper disabled:opacity-40"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Restar uno"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={999}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n)) onChange(Math.max(1, Math.min(999, n)));
        }}
        className="h-full w-12 border-x border-line text-center text-[15px] font-semibold tabular-nums [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/40 [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Cantidad"
      />
      <button
        type="button"
        className="grid h-full w-9 place-items-center rounded-r-lg text-carbon hover:bg-paper disabled:opacity-40"
        onClick={() => onChange(Math.min(999, value + 1))}
        disabled={disabled || value >= 999}
        aria-label="Sumar uno"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function AddToList({
  productId,
  productName,
  initialInList,
  compact,
}: {
  productId: string;
  productName: string;
  initialInList?: number | null;
  compact?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [inList, setInList] = useState<number | null>(initialInList ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      setError(null);
      const r = await setListItemAction(productId, qty, "add");
      if (r.ok) {
        setInList(r.quantity ?? qty);
        setQty(1);
      } else setError(r.message ?? "Error");
    });

  return (
    <div className="grid gap-2">
      <div className={cn("flex gap-2", compact ? "items-center" : "flex-wrap items-center")}>
        <QuantityStepper value={qty} onChange={setQty} disabled={pending} label={`Cantidad de ${productName}`} size={compact ? "sm" : "md"} />
        <Button onClick={add} disabled={pending} size={compact ? "sm" : "md"} variant={compact ? "dark" : "primary"} className={compact ? "flex-1" : ""}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <ListPlus aria-hidden />}
          {compact ? "Agregar" : "Agregar a mi lista"}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-[13px]">
        {error ? (
          <span className="font-medium text-danger">{error}</span>
        ) : inList ? (
          <span className="inline-flex items-center gap-1 font-medium text-brand-ink">
            <Check className="size-4" aria-hidden /> {inList} en tu lista ·{" "}
            <Link href="/catalogo/lista" className="underline">
              ver lista
            </Link>
          </span>
        ) : null}
      </p>
    </div>
  );
}
