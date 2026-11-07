import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/site/auth-forms";
import { Alert } from "@/components/ui/feedback";
import { getAccess } from "@/lib/auth/access";
import { getSettings } from "@/lib/settings";
import { safeNext } from "@/lib/safe-next";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/catalogo");
  const [access, settings] = await Promise.all([getAccess(), getSettings()]);
  if (access.authenticated) redirect("/cuenta");

  return (
    <>
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Registrate gratis para acceder al catálogo de repuestos.
        {settings.requires_approval ? " Después de confirmar tu email, el local aprueba tu cuenta." : ""}
      </p>
      <div className="mt-6 grid gap-4">
        {!isSupabaseConfigured ? (
          <Alert tone="warn" title="Modo demostración">
            El registro todavía no está conectado: falta configurar Supabase.
          </Alert>
        ) : null}
        <SignUpForm next={next} />
      </div>
      <p className="mt-6 border-t border-line pt-5 text-center text-[15px] text-muted">
        ¿Ya tenés cuenta?{" "}
        <Link href={`/ingresar?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-ink hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </>
  );
}
