import Link from "next/link";
import { LayoutGrid, ClipboardList, UserRound, LogOut, ShieldCheck } from "lucide-react";
import { Logo } from "./logo";
import { signOutAction } from "@/app/(site)/(auth)/actions";
import type { Access } from "@/lib/auth/access";

/** Encabezado de las áreas privadas (catálogo, cuenta). */
export function AppHeader({ access, listCount = 0 }: { access: Access; listCount?: number }) {
  const link = "inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-[15px] font-medium text-carbon hover:bg-graphite/5 hover:text-graphite sm:px-3";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur-md">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-graphite focus:px-3 focus:py-2 focus:text-white">
        Saltar al contenido
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo className="shrink-0" />
        <nav aria-label="Área de clientes" className="flex items-center gap-0.5 sm:gap-1">
          {access.can_view_catalog ? (
            <>
              <Link href="/catalogo" className={link}>
                <LayoutGrid className="size-5" aria-hidden />
                <span className="hidden md:inline">Catálogo</span>
              </Link>
              <Link href="/catalogo/lista" className={link} aria-label={`Mi lista de consulta, ${listCount} productos`}>
                <span className="relative">
                  <ClipboardList className="size-5" aria-hidden />
                  {listCount > 0 ? (
                    <span className="absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-graphite">
                      {listCount > 99 ? "99+" : listCount}
                    </span>
                  ) : null}
                </span>
                <span className="hidden md:inline">Mi lista</span>
              </Link>
            </>
          ) : null}
          {access.is_admin ? (
            <Link href="/admin" className={link}>
              <ShieldCheck className="size-5" aria-hidden />
              <span className="hidden md:inline">Admin</span>
            </Link>
          ) : null}
          <Link href="/cuenta" className={link}>
            <UserRound className="size-5" aria-hidden />
            <span className="hidden lg:inline">{access.full_name?.split(" ")[0] ?? "Mi cuenta"}</span>
            <span className="sr-only lg:hidden">Mi cuenta</span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className={link} aria-label="Cerrar sesión">
              <LogOut className="size-5" aria-hidden />
              <span className="hidden xl:inline">Salir</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
