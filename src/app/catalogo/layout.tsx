import type { Metadata } from "next";
import { FlaskConical } from "lucide-react";
import { AppHeader } from "@/components/site/app-header";
import { requireCatalogAccess } from "@/lib/auth/access";
import { getListCount } from "@/lib/catalog";
import { isLocalDemo } from "@/lib/env";
import { demoSourceFile } from "@/lib/demo-catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const access = await requireCatalogAccess();
  const count = await getListCount();
  const demoFile = isLocalDemo ? demoSourceFile() : null;
  return (
    <>
      <AppHeader access={access} listCount={count} />
      {isLocalDemo ? (
        <div className="border-b border-warn/25 bg-warn-soft" role="note">
          <p className="container-page flex items-start gap-2 py-2.5 text-[13px] leading-5 text-carbon">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            <span>
              <strong className="text-warn">Modo demostración local.</strong>{" "}
              {demoFile
                ? `Productos leídos de ${demoFile.split(/[\\/]/).pop()} (sin costos; precios ocultos). `
                : "No se encontró el archivo del catálogo en data/private/. "}
              Al conectar Supabase el catálogo exige iniciar sesión. Este modo nunca se activa en producción.
            </span>
          </p>
        </div>
      ) : null}
      <main id="contenido" className="min-h-[calc(100dvh-4rem)]">
        {children}
      </main>
    </>
  );
}
