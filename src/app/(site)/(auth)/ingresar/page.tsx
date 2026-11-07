import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/site/auth-forms";
import { Alert } from "@/components/ui/feedback";
import { getAccess } from "@/lib/auth/access";
import { safeNext } from "@/lib/safe-next";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function IngresarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/catalogo");
  const access = await getAccess();
  if (access.authenticated) redirect(next);

  const query = (() => {
    try {
      return new URL(next, "http://x").searchParams.get("q");
    } catch {
      return null;
    }
  })();

  return (
    <>
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <p className="mt-1.5 text-[15px] text-muted">Ingresá para ver el catálogo y enviar tus consultas.</p>
      <div className="mt-6 grid gap-4">
        {!isSupabaseConfigured ? (
          <Alert tone="warn" title="Modo demostración">
            Las cuentas todavía no están conectadas: falta configurar Supabase en las variables de entorno.
          </Alert>
        ) : null}
        {sp.error === "enlace" ? (
          <Alert tone="bad" title="El enlace no es válido o venció">
            Pedí uno nuevo: iniciá sesión para reenviar la confirmación o usá “Olvidé mi contraseña”.
          </Alert>
        ) : null}
        {query ? (
          <Alert tone="info">
            Después de ingresar retomamos tu búsqueda: <strong>“{query.slice(0, 80)}”</strong>.
          </Alert>
        ) : null}
        <SignInForm next={next} />
      </div>
      <p className="mt-6 border-t border-line pt-5 text-center text-[15px] text-muted">
        ¿No tenés cuenta?{" "}
        <Link href={`/registro?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-ink hover:underline">
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
