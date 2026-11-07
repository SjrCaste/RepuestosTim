import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = { title: "Confirmá tu email" };

export default function VerificarPage() {
  return (
    <div className="text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
        <MailCheck className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold">Revisá tu correo</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted" role="status">
        Si los datos son correctos, te enviamos un enlace para confirmar tu email. Abrilo para activar tu cuenta. Si no lo ves, revisá la
        carpeta de spam o promociones.
      </p>
      <p className="mt-6 text-[15px]">
        <Link href="/ingresar" className="font-semibold text-brand-ink hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
