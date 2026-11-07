import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { Alert, Card, PageHeader } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";

interface Stats {
  products_active: number;
  products_inactive: number;
  products_no_image: number;
  products_no_price: number;
  categories: number;
  brands: number;
  users_pending: number;
  users_total: number;
  inquiries_new: number;
  last_import: { filename: string; created_at: string; created_count: number; updated_count: number; error_count: number; status: string } | null;
}

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([supabase.rpc("admin_dashboard_stats"), getSettings()]);
  const s = data as Stats;

  const tiles = [
    { label: "Productos activos", value: s.products_active, href: "/admin/productos" },
    { label: "Sin imagen", value: s.products_no_image, href: "/admin/imagenes" },
    { label: "Cuentas pendientes", value: s.users_pending, href: "/admin/usuarios?estado=pending" },
    { label: "Consultas nuevas", value: s.inquiries_new, href: "/admin/consultas" },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Administración" title="Resumen" />

      <div className="grid gap-3">
        {!settings.whatsapp_confirmed ? (
          <Alert tone="warn" title="Número de WhatsApp sin confirmar">
            Se usa {settings.phone_display ?? settings.whatsapp_number}. Confirmalo con el dueño y marcá “confirmado” en{" "}
            <Link href="/admin/configuracion" className="font-semibold underline">
              Configuración
            </Link>
            .
          </Alert>
        ) : null}
        {!settings.business_hours ? (
          <Alert tone="info" title="Horarios sin cargar">
            La web muestra “Consultá horarios por WhatsApp” hasta que cargues los horarios confirmados.
          </Alert>
        ) : null}
        <Alert tone={settings.prices_visible_to_customers ? "ok" : "info"} title={settings.prices_visible_to_customers ? "Precios visibles para clientes" : "Precios ocultos para clientes"}>
          {settings.prices_visible_to_customers
            ? "Los clientes aprobados ven el precio de venta cargado."
            : "Los clientes ven “Consultar precio” y el valor nunca se envía al navegador. Activalo cuando el dueño confirme la vigencia de los precios."}
        </Alert>
      </div>

      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="block rounded-[var(--radius-card)] border border-line bg-white p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
              <p className="text-sm text-muted">{t.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{t.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Catálogo</h2>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[15px]">
            <dt className="text-muted">Activos</dt>
            <dd className="text-right font-semibold tabular-nums">{s.products_active}</dd>
            <dt className="text-muted">Inactivos</dt>
            <dd className="text-right font-semibold tabular-nums">{s.products_inactive}</dd>
            <dt className="text-muted">Sin precio</dt>
            <dd className="text-right font-semibold tabular-nums">{s.products_no_price}</dd>
            <dt className="text-muted">Rubros / marcas</dt>
            <dd className="text-right font-semibold tabular-nums">
              {s.categories} / {s.brands}
            </dd>
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Última importación</h2>
          {s.last_import ? (
            <div className="mt-3 text-[15px]">
              <p className="font-semibold">{s.last_import.filename}</p>
              <p className="text-muted">{formatDate(s.last_import.created_at)}</p>
              <p className="mt-2">
                {s.last_import.created_count} creados · {s.last_import.updated_count} actualizados · {s.last_import.error_count} con error
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[15px] text-muted">Todavía no se importó ningún archivo.</p>
          )}
          <Link href="/admin/importar" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:underline">
            Importar productos <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Card>
      </div>
    </div>
  );
}
