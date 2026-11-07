"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/**
 * Sólo una pista visual: si existe la cookie de sesión de Supabase se muestra
 * "Mi cuenta"/"Catálogo". El acceso real se valida siempre en el servidor.
 */
function subscribe() {
  return () => {};
}
function hasSessionCookie() {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie);
}
function useSessionHint() {
  return useSyncExternalStore(subscribe, hasSessionCookie, () => false);
}

export function SessionAwareActions() {
  const loggedIn = useSessionHint();
  if (loggedIn) {
    return (
      <div className="hidden items-center gap-2 sm:flex">
        <ButtonLink href="/cuenta" variant="ghost" size="sm">
          <UserRound aria-hidden /> Mi cuenta
        </ButtonLink>
        <ButtonLink href="/catalogo" size="sm">
          Catálogo <ArrowRight aria-hidden />
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <ButtonLink href="/ingresar" variant="ghost" size="sm">
        Iniciar sesión
      </ButtonLink>
      <ButtonLink href="/registro" variant="dark" size="sm">
        Crear cuenta
      </ButtonLink>
    </div>
  );
}

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const loggedIn = useSessionHint();
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // cerrar al navegar
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="grid size-11 place-items-center rounded-lg text-graphite hover:bg-graphite/5"
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>
      {open
        ? createPortal(
        <div
          id="menu-movil"
          ref={panelRef}
          className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto border-t border-line bg-white animate-fade-up"
        >
          <nav aria-label="Menú móvil" className="container-page py-4">
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-4 text-lg font-medium text-graphite"
                  >
                    {item.label}
                    <ArrowRight className="size-5 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3">
              {loggedIn ? (
                <>
                  <ButtonLink href="/catalogo" size="lg" onClick={() => setOpen(false)}>
                    Ir al catálogo
                  </ButtonLink>
                  <ButtonLink href="/cuenta" variant="outline" size="lg" onClick={() => setOpen(false)}>
                    Mi cuenta
                  </ButtonLink>
                </>
              ) : (
                <>
                  <ButtonLink href="/ingresar" size="lg" onClick={() => setOpen(false)}>
                    Iniciar sesión
                  </ButtonLink>
                  <ButtonLink href="/registro" variant="outline" size="lg" onClick={() => setOpen(false)}>
                    Crear cuenta
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
