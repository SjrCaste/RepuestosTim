"use client";
import { useState, useTransition } from "react";
import { unzipSync } from "fflate";
import { Images, LoaderCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/feedback";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getImageMatchIndexAction, bulkSetImagesAction, type ImageIndexRow } from "@/app/admin/actions";
import { MAX_IMAGE_BYTES, sniffImageType, storageKeyForSku } from "@/lib/image-upload";
import { normalizeSkuKey, fileBasename } from "@/lib/import/normalize";

interface Candidate {
  name: string;
  bytes: Uint8Array;
  type: ReturnType<typeof sniffImageType>;
  match: ImageIndexRow | null;
  via: "ruta original" | "SKU" | null;
  problem?: string;
}

const MAX_ZIP_BYTES = 300 * 1024 * 1024;

/**
 * Asociación masiva de fotos reales. Todo el procesamiento (ZIP incluido)
 * ocurre en el navegador del admin y las fotos se suben directo a Storage.
 * Coincidencia: 1) nombre de archivo = basename de la ruta original del Excel
 * (C:\FOTOS\TOCHTER\10000TOC.JPG → 10000TOC.JPG); 2) nombre sin extensión = SKU.
 */
export function BulkImages() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const load = (files: FileList | null) => {
    if (!files?.length) return;
    start(async () => {
      setResult(null);
      setProgress(null);
      let index: ImageIndexRow[];
      try {
        index = await getImageMatchIndexAction();
      } catch (e) {
        return setResult({ ok: false, text: `No se pudo leer el catálogo: ${(e as Error).message}` });
      }
      const byBase = new Map(index.filter((r) => r.original_basename).map((r) => [r.original_basename, r]));
      const bySku = new Map(index.map((r) => [r.sku_norm, r]));

      const raw: { name: string; bytes: Uint8Array }[] = [];
      for (const f of Array.from(files)) {
        if (/\.zip$/i.test(f.name)) {
          if (f.size > MAX_ZIP_BYTES) {
            setResult({ ok: false, text: `${f.name} supera 300 MB. Dividilo en partes.` });
            continue;
          }
          try {
            const entries = unzipSync(new Uint8Array(await f.arrayBuffer()), {
              filter: (e) => !e.name.startsWith("__MACOSX") && /\.(jpe?g|png|webp)$/i.test(e.name) && e.originalSize <= MAX_IMAGE_BYTES * 2,
            });
            for (const [name, bytes] of Object.entries(entries)) raw.push({ name: fileBasename(name), bytes });
          } catch {
            setResult({ ok: false, text: `No se pudo abrir ${f.name}.` });
          }
        } else {
          raw.push({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
        }
      }

      const seen = new Set<string>();
      const cands: Candidate[] = raw.map(({ name, bytes }) => {
        const type = sniffImageType(bytes);
        const base = name.toUpperCase();
        let match: ImageIndexRow | null = byBase.get(base) ?? null;
        let via: Candidate["via"] = match ? "ruta original" : null;
        if (!match) {
          match = bySku.get(normalizeSkuKey(base.replace(/\.[^.]+$/, ""))) ?? null;
          via = match ? "SKU" : null;
        }
        let problem: string | undefined;
        if (!type) problem = "No es JPG/PNG/WebP";
        else if (bytes.byteLength > MAX_IMAGE_BYTES) problem = "Supera 5 MB";
        else if (!match) problem = "Sin producto coincidente";
        else if (seen.has(match.id)) problem = "Otra imagen ya coincide con este producto";
        if (match && !problem) seen.add(match.id);
        return { name, bytes, type, match, via, problem };
      });
      setItems(cands);
    });
  };

  const ready = items.filter((c) => !c.problem && (overwrite || !c.match?.has_image));

  const upload = () =>
    start(async () => {
      const supabase = createBrowserSupabase();
      const pairs: { productId: string; path: string }[] = [];
      const failed: string[] = [];
      setProgress({ done: 0, total: ready.length });
      for (let i = 0; i < ready.length; i++) {
        const c = ready[i];
        const key = storageKeyForSku(c.match!.sku, c.type!);
        const { error } = await supabase.storage
          .from("product-images")
          .upload(key, new Blob([c.bytes as BlobPart], { type: c.type! }), { contentType: c.type!, upsert: false });
        if (error) failed.push(`${c.name}: ${error.message}`);
        else pairs.push({ productId: c.match!.id, path: key });
        setProgress({ done: i + 1, total: ready.length });
      }
      let updated = 0;
      for (let i = 0; i < pairs.length; i += 200) {
        const r = await bulkSetImagesAction(pairs.slice(i, i + 200));
        updated += r.updated;
      }
      setResult({
        ok: failed.length === 0,
        text: `${updated} imagen(es) asociadas.${failed.length ? ` ${failed.length} fallaron: ${failed.slice(0, 5).join("; ")}` : ""}`,
      });
      setItems([]);
    });

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-graphite px-4 font-semibold text-white hover:bg-carbon">
          {pending && !progress ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Images className="size-5 text-brand" aria-hidden />}
          Elegir ZIP o imágenes
          <input type="file" multiple accept=".zip,image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(e) => load(e.target.files)} />
        </label>
        <p className="mt-3 text-[13px] text-muted">
          Nombrá cada foto como en la columna de imagen original (ej. 10000TOC.JPG) o con el SKU. Se procesa en tu navegador; máx. 5 MB por foto.
        </p>
      </Card>

      {result ? (
        <Alert tone={result.ok ? "ok" : "warn"} live>
          {result.text}
        </Alert>
      ) : null}

      {items.length > 0 ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              {items.length} archivo(s) · {items.filter((i) => !i.problem).length} con coincidencia · {ready.length} para subir
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="size-4 accent-brand-ink" />
              Reemplazar imágenes existentes
            </label>
          </div>
          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-paper">
                <tr>
                  <th scope="col" className="px-3 py-2">Archivo</th>
                  <th scope="col" className="px-3 py-2">Producto</th>
                  <th scope="col" className="px-3 py-2">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono">{c.name}</td>
                    <td className="px-3 py-1.5 font-mono">{c.match?.sku ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      {c.problem ? (
                        <Badge tone="bad">{c.problem}</Badge>
                      ) : c.match?.has_image && !overwrite ? (
                        <Badge>Ya tiene imagen</Badge>
                      ) : (
                        <Badge tone="ok">Coincide por {c.via}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={upload} disabled={pending || ready.length === 0}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Upload aria-hidden />} Subir {ready.length} imagen(es)
            </Button>
            {progress ? (
              <span className="text-sm text-muted" role="status">
                {progress.done} / {progress.total}
              </span>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
