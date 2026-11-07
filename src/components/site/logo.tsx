import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Si existe el logo oficial (BRAND.logoSrc) se usa tal cual. Mientras tanto se
 * muestra el nombre del comercio como texto: NO es un logo redibujado.
 */
export function Logo({ dark = false, className }: { dark?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5 rounded-md", className)} aria-label="TIM REPUESTOS — inicio">
      {BRAND.logoSrc ? (
        <Image src={BRAND.logoSrc} alt="TIM REPUESTOS" width={BRAND.logoWidth} height={BRAND.logoHeight} priority className="h-9 w-auto sm:h-10" />
      ) : (
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="h-7 w-1.5 rounded-full bg-brand" />
          <span className={cn("font-display text-[19px] font-bold leading-none tracking-tight", dark ? "text-white" : "text-graphite")}>
            TIM <span className={dark ? "text-brand" : "text-brand-ink"}>REPUESTOS</span>
          </span>
        </span>
      )}
    </Link>
  );
}
