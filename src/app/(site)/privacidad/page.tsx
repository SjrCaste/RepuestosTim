import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { Alert } from "@/components/ui/feedback";
import { getSettings } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = { title: "Política de privacidad", alternates: { canonical: "/privacidad" } };

/**
 * BORRADOR para revisión legal del comercio. No inventa razón social, CUIT ni
 * domicilio legal: esos datos deben completarse antes de publicar la versión final.
 */
export default async function PrivacidadPage() {
  const s = await getSettings();
  return (
    <>
      <PageHero eyebrow="Legal" title="Política de privacidad" />
      <section className="container-page max-w-3xl py-12">
        <Alert tone="warn" title="Borrador pendiente de revisión">
          Este texto es una versión preliminar (versión {s.privacy_policy_version}). El comercio debe revisarlo y completar sus datos legales antes de
          su publicación definitiva.
        </Alert>
        <div className="prose-legal mt-8">
          <h2>Responsable de los datos</h2>
          <p>
            {s.store_name}, con domicilio comercial en {s.address}. [Razón social, CUIT y domicilio legal: a completar por el comercio.]
          </p>
          <h2>Qué datos recopilamos</h2>
          <ul>
            <li>Datos de registro: nombre, email y, si lo informás, teléfono.</li>
            <li>Consultas que enviás desde el catálogo: productos, cantidades y comentarios.</li>
            <li>Datos técnicos mínimos de seguridad (por ejemplo, registros de acceso y limitación de intentos).</li>
          </ul>
          <p>La contraseña la gestiona nuestro proveedor de autenticación de forma cifrada; no la almacenamos en texto legible.</p>
          <h2>Para qué los usamos</h2>
          <ul>
            <li>Darte acceso al catálogo para clientes y administrar tu cuenta.</li>
            <li>Responder tus consultas sobre repuestos, disponibilidad y precios.</li>
            <li>Proteger el sitio contra usos abusivos.</li>
          </ul>
          <p>No vendemos ni cedemos tus datos a terceros con fines comerciales.</p>
          <h2>Proveedores</h2>
          <p>
            Usamos servicios de alojamiento y base de datos (Vercel y Supabase) que procesan datos por cuenta nuestra. Al enviar una consulta por
            WhatsApp, el mensaje se rige además por las condiciones de ese servicio.
          </p>
          <h2>Tus derechos</h2>
          <p>
            Podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos, conforme a la Ley 25.326 de Protección de
            los Datos Personales. Para hacerlo, escribinos por los canales de contacto del sitio. La Agencia de Acceso a la Información Pública, en
            su carácter de órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes
            resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
          </p>
          <h2>Conservación</h2>
          <p>Conservamos tus datos mientras tu cuenta esté activa o sea necesario para responder tus consultas. [Plazos a definir por el comercio.]</p>
          <h2>Cambios</h2>
          <p>Si modificamos esta política, publicaremos la nueva versión en esta página indicando su fecha.</p>
        </div>
      </section>
    </>
  );
}
