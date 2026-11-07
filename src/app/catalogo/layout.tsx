import type { Metadata } from "next";
import { AppHeader } from "@/components/site/app-header";
import { requireCatalogAccess } from "@/lib/auth/access";
import { getListCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const access = await requireCatalogAccess();
  const count = await getListCount();
  return (
    <>
      <AppHeader access={access} listCount={count} />
      <main id="contenido" className="min-h-[calc(100dvh-4rem)]">
        {children}
      </main>
    </>
  );
}
