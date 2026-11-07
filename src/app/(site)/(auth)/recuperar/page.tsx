import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/site/auth-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-1.5 text-[15px] text-muted">Te enviamos un enlace por email para elegir una contraseña nueva.</p>
      <div className="mt-6">
        <ForgotForm />
      </div>
      <p className="mt-6 border-t border-line pt-5 text-center text-[15px]">
        <Link href="/ingresar" className="font-semibold text-brand-ink hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
