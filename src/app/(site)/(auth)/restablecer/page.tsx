import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/site/auth-forms";
import { Alert } from "@/components/ui/feedback";
import { getAccess } from "@/lib/auth/access";

export const metadata: Metadata = { title: "Nueva contraseña" };
export const dynamic = "force-dynamic";

export default async function RestablecerPage() {
  const access = await getAccess();
  return (
    <>
      <h1 className="text-2xl font-semibold">Elegí una nueva contraseña</h1>
      <div className="mt-6">
        {access.authenticated ? (
          <ResetForm />
        ) : (
          <Alert tone="bad" title="El enlace venció o ya fue usado">
            <Link href="/recuperar" className="font-semibold underline">
              Pedí un enlace nuevo
            </Link>
            .
          </Alert>
        )}
      </div>
    </>
  );
}
