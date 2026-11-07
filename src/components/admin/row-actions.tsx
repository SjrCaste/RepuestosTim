"use client";
import { useState, useTransition } from "react";
import { setUserStatusAction, setInquiryStatusAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function UserStatusActions({ id, status }: { id: string; status: "active" | "pending" | "blocked" }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (s: "active" | "pending" | "blocked", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await setUserStatusAction(id, s);
      setMsg(r.ok ? null : (r.message ?? "Error"));
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "active" ? (
        <Button size="sm" disabled={pending} onClick={() => run("active")}>
          {status === "blocked" ? "Reactivar" : "Aprobar"}
        </Button>
      ) : null}
      {status !== "blocked" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("blocked", "¿Bloquear esta cuenta? Perderá el acceso al catálogo.")}>
          Bloquear
        </Button>
      ) : null}
      {msg ? <span className="text-xs text-danger" role="alert">{msg}</span> : null}
    </div>
  );
}

const STATUSES = [
  { v: "new", l: "Nueva" },
  { v: "contacted", l: "Respondida" },
  { v: "closed", l: "Cerrada" },
  { v: "cancelled", l: "Cancelada" },
];

export function InquiryStatusSelect({ id, status }: { id: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`st-${id}`} className="sr-only">
        Estado de la consulta
      </label>
      <select
        id={`st-${id}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          const prev = value;
          setValue(v);
          start(async () => {
            const r = await setInquiryStatusAction(id, v);
            if (!r.ok) {
              setValue(prev);
              setErr(r.message ?? "Error");
            } else setErr(null);
          });
        }}
        className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s.v} value={s.v}>
            {s.l}
          </option>
        ))}
      </select>
      {err ? <span className="text-xs text-danger" role="alert">{err}</span> : null}
    </div>
  );
}
