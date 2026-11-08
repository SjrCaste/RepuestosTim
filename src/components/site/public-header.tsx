import { Logo } from "./logo";
import { MobileNav, SessionAwareActions } from "./public-header-client";

export const PUBLIC_NAV = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/categorias", label: "Categorías" },
  { href: "/como-comprar", label: "Cómo comprar" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Ubicación y contacto" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-graphite focus:px-3 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[72px]">
        <Logo />
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="rounded-md px-3 py-2 text-[15px] font-medium text-carbon transition-colors hover:bg-graphite/5 hover:text-graphite">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <SessionAwareActions />
          <MobileNav items={PUBLIC_NAV} />
        </div>
      </div>
    </header>
  );
}
