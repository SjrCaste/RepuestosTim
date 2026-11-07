"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { FileSpreadsheet, LoaderCircle, Upload, CircleCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import {
  previewImportAction,
  validateImportAction,
  runImportAction,
  setProductsActiveAction,
  type ImportPreview,
  type ImportValidation,
  type ImportOutcome,
} from "@/app/admin/actions";
import { CATALOG_FIELDS, COST_FIELDS, type ColumnMapping, type ImportKind } from "@/lib/import/mapping";

type Step = "upload" | "map" | "validated" | "done";

export function ImportWizard() {
  const [kind, setKind] = useState<ImportKind>("catalog");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [deactivated, setDeactivated] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fields = kind === "catalog" ? CATALOG_FIELDS : COST_FIELDS;

  const formData = () => {
    const fd = new FormData();
    fd.set("kind", kind);
    if (file) fd.set("file", file);
    for (const f of fields) fd.set(`map_${f.key}`, String(mapping[f.key] ?? -1));
    return fd;
  };

  const reset = () => {
    setFile(null);
    setStep("upload");
    setPreview(null);
    setValidation(null);
    setOutcome(null);
    setError(null);
    setDeactivated(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const doPreview = () =>
    start(async () => {
      setError(null);
      const r = await previewImportAction(formData());
      if (!r.ok) return setError(r.message ?? "Error");
      setPreview(r);
      setMapping(r.mapping ?? {});
      setStep("map");
    });

  const doValidate = () =>
    start(async () => {
      setError(null);
      const r = await validateImportAction(formData());
      if (!r.ok) return setError([r.message, ...(r.mappingErrors ?? [])].filter(Boolean).join(" "));
      setValidation(r);
      setStep("validated");
    });

  const doImport = () =>
    start(async () => {
      setError(null);
      const r = await runImportAction(formData());
      setOutcome(r);
      if (!r.ok) return setError(r.message ?? "Error");
      setStep("done");
    });

  return (
    <div className="grid gap-5">
      {/* Paso 1 */}
      <Card className="p-5">
        <h2 className="font-semibold">1. Tipo de importación y archivo</h2>
        <fieldset className="mt-4 grid gap-3 sm:grid-cols-2" disabled={step !== "upload"}>
          <legend className="sr-only">Tipo de importación</legend>
          {[
            { v: "catalog" as const, title: "Catálogo de productos", text: "SKU, nombre, marca, rubro, precio de venta, descripción, imagen de origen, activo. Actualiza por SKU sin duplicar." },
            { v: "costs" as const, title: "Costos (sólo admin)", text: "SKU + precio de costo. Se guarda en una tabla privada. Sólo actualiza SKUs existentes." },
          ].map((o) => (
            <label key={o.v} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${kind === o.v ? "border-graphite bg-paper" : "border-line"}`}>
              <input type="radio" name="kind" value={o.v} checked={kind === o.v} onChange={() => setKind(o.v)} className="mt-1 accent-brand-ink" />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  {o.v === "costs" ? <Lock className="size-4" aria-hidden /> : null}
                  {o.title}
                </span>
                <span className="mt-1 block text-[13px] leading-5 text-muted">{o.text}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-4 font-semibold hover:bg-paper ${step !== "upload" ? "pointer-events-none opacity-50" : ""}`}>
            <FileSpreadsheet className="size-5 text-brand-ink" aria-hidden />
            {file ? file.name : "Elegir archivo .csv o .xlsx"}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {step === "upload" ? (
            <Button onClick={doPreview} disabled={!file || pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />} Leer archivo
            </Button>
          ) : (
            <Button variant="ghost" onClick={reset} disabled={pending}>
              Empezar de nuevo
            </Button>
          )}
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Máx. 4 MB y 20.000 filas. Se aceptan CSV (UTF-8 o Windows-1252, separador , ; o tab) y Excel .xlsx — también archivos “.XLS” que en realidad
          son xlsx. No se ejecutan fórmulas ni macros: se rechazan libros con macros.
        </p>
      </Card>

      {error ? (
        <Alert tone="bad" live>
          {error}
        </Alert>
      ) : null}

      {/* Paso 2 */}
      {preview && step !== "upload" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">2. Vista previa y asignación de columnas</h2>
            <div className="flex flex-wrap gap-1.5">
              <Badge>{preview.format?.toUpperCase()}</Badge>
              {preview.sheetName ? <Badge>Hoja: {preview.sheetName}</Badge> : null}
              {preview.encoding ? <Badge>{preview.encoding}</Badge> : null}
              <Badge tone="info">{preview.totalRows} filas</Badge>
            </div>
          </div>
          {preview.warnings?.length ? (
            <Alert tone="warn" className="mt-3">
              <ul className="list-disc pl-4">
                {preview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Alert>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((f) => (
              <div key={f.key} className="grid gap-1">
                <label htmlFor={`map-${f.key}`} className="text-sm font-semibold">
                  {f.label} {f.required ? <span className="text-danger">*</span> : null}
                </label>
                <Select
                  id={`map-${f.key}`}
                  value={String(mapping[f.key] ?? -1)}
                  disabled={step !== "map"}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
                >
                  <option value="-1">— No importar —</option>
                  {preview.headers?.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </Select>
                {f.help ? <p className="text-xs text-muted">{f.help}</p> : null}
              </div>
            ))}
          </div>
          <div className="mt-5 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <caption className="sr-only">Primeras 20 filas del archivo</caption>
              <thead className="bg-paper">
                <tr>
                  <th scope="col" className="px-2 py-2 text-muted">#</th>
                  {preview.headers?.map((h, i) => (
                    <th key={i} scope="col" className="whitespace-nowrap px-2 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.sample?.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5 text-muted">{i + 2}</td>
                    {r.map((c, j) => (
                      <td key={j} className="max-w-[220px] truncate px-2 py-1.5" title={c === null ? "" : String(c)}>
                        {c === null ? "" : String(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {step === "map" ? (
            <Button className="mt-5" onClick={doValidate} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null} Validar filas
            </Button>
          ) : null}
        </Card>
      ) : null}

      {/* Paso 3 */}
      {validation && (step === "validated" || step === "done") ? (
        <Card className="p-5">
          <h2 className="font-semibold">3. Validación</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Filas leídas", validation.totalRows],
              ["Válidas", validation.validCount],
              ["Con error (no se importan)", validation.errorCount],
              ["Duplicadas idénticas omitidas", validation.skippedDuplicates],
              ...(kind === "catalog"
                ? ([
                    ["SKU nuevos", validation.newCount],
                    ["SKU existentes (se actualizan)", validation.existingCount],
                    ["Marcas", validation.brands?.length],
                    ["Rubros", validation.categories?.length],
                  ] as const)
                : ([["SKU existentes", validation.existingCount], ["SKU inexistentes (se rechazan)", validation.newCount]] as const)),
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-line p-3">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="text-xl font-semibold tabular-nums">{v ?? 0}</dd>
              </div>
            ))}
          </dl>
          {kind === "catalog" && validation.categories?.length ? (
            <p className="mt-3 text-[13px] text-muted">
              Rubros: {validation.categories.join(" · ")} — Marcas: {validation.brands?.join(" · ")}
            </p>
          ) : null}
          <IssueTable title="Errores" tone="bad" issues={validation.errors ?? []} />
          <IssueTable title="Advertencias" tone="warn" issues={validation.warnings ?? []} />
          {step === "validated" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={doImport} disabled={pending || !validation.validCount}>
                {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <CircleCheck aria-hidden />}
                Confirmar importación de {validation.validCount} filas
              </Button>
              <p className="text-[13px] text-muted">UPSERT por SKU: no duplica y no borra productos que no estén en el archivo.</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Paso 4 */}
      {outcome?.ok && step === "done" ? (
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <CircleCheck className="size-5 text-brand-ink" aria-hidden /> 4. Importación completada
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" role="status">
            {[
              ["Creados", outcome.created],
              ["Actualizados", outcome.updated],
              ["Sin cambios", outcome.unchanged],
              ["Rechazados", outcome.rejected],
              ["Duplicados omitidos", outcome.skipped],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-line p-3">
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="text-xl font-semibold tabular-nums">{v ?? 0}</dd>
              </div>
            ))}
          </dl>
          {outcome.notFound?.length ? (
            <Alert tone="warn" className="mt-4" title={`${outcome.notFound.length} SKU del archivo de costos no existen en el catálogo`}>
              {outcome.notFound.slice(0, 30).join(", ")}
              {outcome.notFound.length > 30 ? "…" : ""}
            </Alert>
          ) : null}
          {outcome.missing?.length ? (
            <div className="mt-4 rounded-xl border border-warn/25 bg-warn-soft p-4">
              <p className="font-semibold text-warn">{outcome.missing.length} producto(s) activos de esas marcas no estaban en este archivo.</p>
              <p className="mt-1 text-[13px] text-carbon">
                No se modificaron. Si ya no se venden, podés desactivarlos (no se borran y se pueden reactivar).
              </p>
              <details className="mt-2 text-[13px]">
                <summary className="cursor-pointer font-semibold">Ver lista</summary>
                <p className="mt-1 font-mono">{outcome.missing.slice(0, 200).map((m) => m.sku).join(", ")}</p>
              </details>
              {deactivated ? (
                <p className="mt-3 text-sm font-semibold text-brand-ink" role="status">
                  {deactivated}
                </p>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(`¿Desactivar ${outcome.missing!.length} producto(s) que no vinieron en el archivo?`)) return;
                    start(async () => {
                      const r = await setProductsActiveAction(outcome.missing!.map((m) => m.id), false);
                      setDeactivated(r.message);
                    });
                  }}
                >
                  Desactivar {outcome.missing.length} producto(s)
                </Button>
              )}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {outcome.jobId ? (
              <Link href={`/admin/importaciones/${outcome.jobId}`} className="text-sm font-semibold text-brand-ink underline">
                Ver registro de la importación
              </Link>
            ) : null}
            <button type="button" onClick={reset} className="text-sm font-semibold text-carbon underline">
              Importar otro archivo
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function IssueTable({ title, tone, issues }: { title: string; tone: "bad" | "warn"; issues: { row: number; sku?: string; field?: string; message: string; value?: string }[] }) {
  if (!issues.length) return null;
  return (
    <details className="mt-4 rounded-lg border border-line" open={tone === "bad" && issues.length <= 30}>
      <summary className={`cursor-pointer px-3 py-2 text-sm font-semibold ${tone === "bad" ? "text-danger" : "text-warn"}`}>
        {title} ({issues.length}
        {issues.length >= 300 ? "+, se muestran 300" : ""})
      </summary>
      <div className="max-h-80 overflow-auto border-t border-line">
        <table className="w-full text-left text-[13px]">
          <thead className="sticky top-0 bg-paper">
            <tr>
              <th scope="col" className="px-3 py-1.5">Fila</th>
              <th scope="col" className="px-3 py-1.5">SKU</th>
              <th scope="col" className="px-3 py-1.5">Campo</th>
              <th scope="col" className="px-3 py-1.5">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {issues.map((e, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 tabular-nums">{e.row}</td>
                <td className="px-3 py-1.5 font-mono">{e.sku ?? ""}</td>
                <td className="px-3 py-1.5">{e.field ?? ""}</td>
                <td className="px-3 py-1.5">
                  {e.message}
                  {e.value ? <span className="text-muted"> ({e.value})</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
