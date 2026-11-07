import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { Alert } from "@/components/ui/feedback";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = { title: "Términos de uso", alternates: { canonical: "/terminos" } };

export default async function TerminosPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="Legal" title="Términos de uso" />
      <section className="container-page max-w-3xl py-12">
        <Alert tone="warn" title="Borrador pendiente de revisión">
          Versión preliminar para revisión del comercio antes de su publicación definitiva.
        </Alert>
        <div className="prose-legal mt-8">
          <h2>Uso del catálogo</h2>
          <p>
            El catálogo es una herramienta de consulta para clientes registrados de {s.store_name}. La información publicada (descripciones,
            imágenes y, cuando se muestren, precios) es orientativa.
          </p>
          <h2>Precios y disponibilidad</h2>
          <p>
            Los precios y la disponibilidad se confirman con el local en cada consulta. Enviar una consulta no constituye una reserva ni una
            compra. Por ahora el sitio no procesa pagos.
          </p>
          <h2>Compatibilidad</h2>
          <p>
            La compatibilidad de un repuesto con un vehículo la confirma el local. Sólo se considera verificada cuando la ficha del producto lo
            indica expresamente.
          </p>
          <h2>Cuenta</h2>
          <p>
            Sos responsable de mantener la confidencialidad de tu contraseña. Podemos suspender cuentas ante usos abusivos, como la extracción
            automatizada del catálogo.
          </p>
          <h2>Contacto</h2>
          <p>{s.address}.</p>
        </div>
      </section>
    </>
  );
}
