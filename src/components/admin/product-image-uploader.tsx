"use client";
import { useState, useTransition } from "react";
import { Upload, Trash2, LoaderCircle } from "lucide-react";
import { ProductImage } from "@/components/catalog/product-image";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { setProductImageAction } from "@/app/admin/actions";
import { MAX_IMAGE_BYTES, sniffImageType, storageKeyForSku } from "@/lib/image-upload";

/**
 * Sube la imagen directo a Supabase Storage desde el navegador del admin
 * (evita el límite de 4,5 MB de las funciones de Vercel). La policy de Storage
 * sólo permite escribir a administradores.
 */
export function ProductImageUploader({ productId, sku, imageUrl }: { productId: string; sku: string; imageUrl: string | null }) {
  const [preview, setPreview] = useState(imageUrl);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    start(async () => {
      setMsg(null);
      if (file.size > MAX_IMAGE_BYTES) return setMsg({ ok: false, text: "La imagen supera 5 MB." });
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const type = sniffImageType(head);
      if (!type) return setMsg({ ok: false, text: "Formato no admitido: usá JPG, PNG o WebP." });
      const key = storageKeyForSku(sku, type);
      const supabase = createBrowserSupabase();
      const { error } = await supabase.storage.from("product-images").upload(key, file, { contentType: type, upsert: false, cacheControl: "3600" });
      if (error) return setMsg({ ok: false, text: `No se pudo subir: ${error.message}` });
      const r = await setProductImageAction(productId, key);
      if (!r.ok) return setMsg({ ok: false, text: r.message ?? "Error" });
      setPreview(URL.createObjectURL(file));
      setMsg({ ok: true, text: "Imagen actualizada." });
    });
  };

  const remove = () => {
    if (!window.confirm("¿Quitar la imagen de este producto?")) return;
    start(async () => {
      const r = await setProductImageAction(productId, null);
      if (r.ok) {
        setPreview(null);
        setMsg({ ok: true, text: "Imagen quitada." });
      } else setMsg({ ok: false, text: r.message ?? "Error" });
    });
  };

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-xl border border-line">
        <ProductImage src={preview} alt={`Imagen de ${sku}`} className="aspect-square w-full" />
      </div>
      {msg ? (
        <Alert tone={msg.ok ? "ok" : "bad"} live>
          {msg.text}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-graphite px-4 text-sm font-semibold text-white focus-within:ring-3 focus-within:ring-brand/40 hover:bg-carbon">
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {preview ? "Reemplazar" : "Subir imagen"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={pending} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {preview ? (
          <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
            <Trash2 aria-hidden /> Quitar
          </Button>
        ) : null}
      </div>
      <p className="text-[13px] text-muted">JPG, PNG o WebP, hasta 5 MB. Sólo fotos reales del producto.</p>
    </div>
  );
}
