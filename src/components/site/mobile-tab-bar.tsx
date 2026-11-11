"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Lock, LayoutGrid, MapPin } from "lucide-react";
import { WhatsAppIcon } from "./brand-icons";

const TABS = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/catalogo", label: "Catálogo", icon: Lock },
  { href: "/categorias", label: "Rubros", icon: LayoutGrid },
  { href: "/contacto", label: "Contacto", icon: MapPin },
];

/** Navegación por secciones en celular (debajo de lg). Reemplaza al botón flotante de WhatsApp. */
export function MobileTabBar({ whatsappHref }: { whatsappHref: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <>
      <div className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden />
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-brand-ink" : "text-muted"}`}
                >
                  <Icon className="size-[22px]" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp (se abre en otra pestaña)"
              className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-graphite"
            >
              <span className="grid size-7 place-items-center rounded-full bg-brand text-graphite">
                <WhatsAppIcon className="size-4" />
              </span>
              WhatsApp
            </a>
          </li>
        </ul>
      </nav>
    </>
  );
}
