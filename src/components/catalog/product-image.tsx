"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Imagen de producto con placeholder sobrio. Si no hay imagen, o si la URL
 * falla al cargar, nunca se muestra un ícono de imagen rota.
 */
export function ProductImage({ src, alt, className, priority }: { src: string | null; alt: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("tech-grid-light flex flex-col items-center justify-center gap-2 bg-paper text-muted", className)} role="img" aria-label="Imagen no disponible">
        <ImageOff className="size-7 opacity-70" aria-hidden />
        <span className="text-xs font-medium">Imagen no disponible</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal: no pasa por el optimizador
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
