"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string | null;
  alt: string;
  category?: string | null;
  sku?: string | null;
  className?: string;
  priority?: boolean;
}

/** Obtiene la foto de estudio de catálogo según el rubro o nombre automotor */
export function getCategoryPhoto(category?: string | null, name?: string | null): string {
  const text = `${category ?? ""} ${name ?? ""}`.toLowerCase();
  if (text.includes("amortiguador")) return "/products/amortiguadores.jpg";
  if (text.includes("parrilla")) return "/products/parrillas-de-suspension.jpg";
  if (text.includes("maza")) return "/products/maza-de-rueda.jpg";
  if (text.includes("extremo")) return "/products/extremos-de-direccion.jpg";
  if (text.includes("rotula")) return "/products/rotulas.jpg";
  if (text.includes("cazoleta")) return "/products/cazoleta-de-suspension.jpg";
  if (text.includes("homocinetica")) return "/products/homocinetica.svg";
  if (text.includes("precap")) return "/products/precap.svg";
  if (text.includes("crapodina")) return "/products/crapodinas-de-suspension.svg";
  return "/products/amortiguadores.jpg";
}

/**
 * Componente de imagen de repuesto.
 * Muestra la foto real del producto si existe en Storage,
 * o la fotografía de estudio / render del rubro correspondiente.
 */
export function ProductImage({ src, alt, category, sku, className, priority }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const fallbackSrc = getCategoryPhoto(category, alt);
  const imageToDisplay = src && !failed ? src : fallbackSrc;

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-white p-2 select-none", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageToDisplay}
        alt={alt || "Repuesto automotor"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          if (!failed && src) setFailed(true);
        }}
        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
      />

      {/* Marca de agua sutil TOCHTER */}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 opacity-70">
        <span className="rounded bg-slate-900/70 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white backdrop-blur">
          TOCHTER
        </span>
        {sku ? (
          <span className="rounded bg-slate-100/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-800 shadow-sm backdrop-blur">
            {sku}
          </span>
        ) : null}
      </div>

      {/* Badge Mayorista & Minorista */}
      <div className="pointer-events-none absolute top-2 right-2">
        <span className="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur">
          Mayorista & Minorista
        </span>
      </div>
    </div>
  );
}
