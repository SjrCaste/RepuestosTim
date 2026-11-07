import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function NotFound() {
  return (
    <main className="tech-grid-light grid min-h-dvh place-items-center bg-paper px-4">
      <div className="max-w-md text-center">
        <Logo className="mb-10" />
        <p className="font-display text-6xl font-semibold text-graphite/15">404</p>
        <h1 className="mt-2 text-2xl font-semibold">No encontramos esta página</h1>
        <p className="mt-2 text-muted">Puede que el enlace haya cambiado.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-5 font-semibold text-graphite hover:bg-brand-hover">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
