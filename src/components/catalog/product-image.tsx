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

/** Icono esquemático técnico según el rubro de repuesto */
function CategoryIcon({ category }: { category?: string | null }) {
  const cat = (category ?? "").toLowerCase();

  if (cat.includes("amortiguador")) {
    // Amortiguador / Strut
    return (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
        {/* Ojal superior */}
        <circle cx="50" cy="12" r="6" />
        {/* Vástago del pistón */}
        <line x1="50" y1="18" x2="50" y2="38" />
        {/* Resorte / Espiral */}
        <path d="M40 38 Q50 34 60 38 Q50 43 40 47 Q50 51 60 55 Q50 60 40 64 Q50 68 60 72" />
        {/* Cuerpo del cilindro */}
        <rect x="42" y="52" width="16" height="34" rx="3" />
        <line x1="42" y1="62" x2="58" y2="62" strokeWidth="1.5" />
        <line x1="42" y1="76" x2="58" y2="76" strokeWidth="1.5" />
        {/* Ojal inferior */}
        <circle cx="50" cy="90" r="4" />
      </svg>
    );
  }

  if (cat.includes("parrilla")) {
    // Parrilla de suspensión (Brazo oscilante triangular)
    return (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
        {/* Rótula externa */}
        <circle cx="20" cy="50" r="6" />
        {/* Bujes de chasis */}
        <circle cx="80" cy="26" r="7" />
        <circle cx="80" cy="74" r="7" />
        {/* Brazos triangulares */}
        <path d="M26 47 L73 28 M26 53 L73 72" />
        {/* Refuerzo central */}
        <ellipse cx="60" cy="50" rx="10" ry="8" strokeWidth="1.5" />
      </svg>
    );
  }

  if (cat.includes("maza")) {
    // Maza de rueda con agujeros de bulón y rulemán
    return (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
        {/* Plato exterior */}
        <circle cx="50" cy="50" r="38" />
        <circle cx="50" cy="50" r="24" strokeWidth="1.5" strokeDasharray="3 3" />
        {/* Centro / Rulemán */}
        <circle cx="50" cy="50" r="12" />
        {/* 5 agujeros de bulón */}
        <circle cx="50" cy="24" r="4" fill="currentColor" />
        <circle cx="75" cy="42" r="4" fill="currentColor" />
        <circle cx="65" cy="71" r="4" fill="currentColor" />
        <circle cx="35" cy="71" r="4" fill="currentColor" />
        <circle cx="25" cy="42" r="4" fill="currentColor" />
      </svg>
    );
  }

  if (cat.includes("homocinetica")) {
    // Junta homocinética y fuelle
    return (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
        {/* Eje estriado */}
        <rect x="10" y="44" width="22" height="12" rx="2" />
        <line x1="16" y1="44" x2="16" y2="56" strokeWidth="1.5" />
        <line x1="22" y1="44" x2="22" y2="56" strokeWidth="1.5" />
        {/* Fuelle corrugado */}
        <path d="M32 42 L38 34 L44 42 L50 34 L56 42 L62 34 L68 40" />
        <path d="M32 58 L38 66 L44 58 L50 66 L56 58 L62 66 L68 60" />
        {/* Campana / Junta */}
        <path d="M68 34 C82 34 88 42 88 50 C88 58 82 66 68 66 Z" />
      </svg>
    );
  }

  if (cat.includes("extremo") || cat.includes("precap")) {
    // Extremo de dirección / Precap
    return (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
        {/* Vástago roscado */}
        <rect x="15" y="46" width="45" height="8" rx="2" />
        <line x1="22" y1="46" x2="22" y2="54" strokeWidth="1.5" />
        <line x1="30" y1="46" x2="30" y2="54" strokeWidth="1.5" />
        <line x1="38" y1="46" x2="38" y2="54" strokeWidth="1.5" />
        {/* Cabezal de articulación */}
        <circle cx="72" cy="50" r="14" />
        {/* Perno cónico */}
        <line x1="72" y1="36" x2="72" y2="18" strokeWidth="4" />
        <circle cx="72" cy="16" r="3" fill="currentColor" />
      </svg>
    );
  }

  if (cat.includes("rotula")) {
    // Rótula de suspensión
    return (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
        {/* Base de fijación */}
        <path d="M20 70 L80 70" strokeWidth="4" />
        <circle cx="28" cy="70" r="3" fill="currentColor" />
        <circle cx="72" cy="70" r="3" fill="currentColor" />
        {/* Cuerpo cúpula */}
        <path d="M35 70 C35 50 65 50 65 70" />
        {/* Perno esférico cónico */}
        <path d="M44 50 L46 25 L54 25 L56 50" fill="currentColor" opacity="0.3" />
        <line x1="50" y1="50" x2="50" y2="20" strokeWidth="3" />
        <circle cx="50" cy="18" r="4" fill="currentColor" />
      </svg>
    );
  }

  // Cazoleta o genérico de suspensión
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-20 opacity-80 sm:size-24">
      {/* Plato de soporte */}
      <ellipse cx="50" cy="50" rx="36" ry="24" />
      <ellipse cx="50" cy="50" rx="20" ry="12" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="6" fill="currentColor" />
      <circle cx="28" cy="45" r="3" fill="currentColor" />
      <circle cx="72" cy="45" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * Imagen de producto con soporte para fotos reales de Supabase Storage
 * y visuales técnicos automotrices por rubro cuando la foto no está cargada.
 */
export function ProductImage({ src, alt, category, sku, className, priority }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden border-b border-line bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4 text-slate-100 select-none",
          className,
        )}
        role="img"
        aria-label={alt || "Repuesto automotor"}
      >
        {/* Patrón de cuadrícula técnica milimétrica */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Círculo de brillo sutil central */}
        <div className="pointer-events-none absolute size-44 rounded-full bg-brand-primary/10 blur-2xl" />

        {/* Encabezado con marca y categoría */}
        <div className="relative z-10 mb-auto flex w-full items-center justify-between gap-1 text-[11px] uppercase tracking-wider text-slate-400">
          <span className="font-mono font-bold tracking-widest text-slate-300">TOCHTER</span>
          {category ? (
            <span className="truncate rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur">
              {category}
            </span>
          ) : null}
        </div>

        {/* Esquema técnico central */}
        <div className="relative z-10 my-auto text-brand-primary transition-transform duration-300 group-hover:scale-105">
          <CategoryIcon category={category} />
        </div>

        {/* Pie de tarjeta técnica */}
        <div className="relative z-10 mt-auto flex w-full items-end justify-between text-[11px]">
          {sku ? <span className="font-mono text-xs font-semibold text-slate-400">{sku}</span> : <span />}
          <span className="rounded bg-brand-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary backdrop-blur">
            Mayorista & Minorista
          </span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("bg-white object-contain", className)}
    />
  );
}
