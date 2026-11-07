import type { Metadata } from "next";
import { AppHeader } from "@/components/site/app-header";
import { requireUser } from "@/lib/auth/access";
import { getListCount } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false, follow: false } };

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const access = await requireUser("/cuenta");
  const count = access.can_view_catalog ? await getListCount() : 0;
  return (
    <>
      <AppHeader access={access} listCount={count} />
      <main id="contenido" className="min-h-[calc(100dvh-4rem)]">
        {children}
      </main>
    </>
  );
}
