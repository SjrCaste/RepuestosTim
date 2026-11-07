import { ArrowRight, Clock, MailWarning, Ban, CircleCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { ProfileForm } from "@/components/site/profile-form";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/feedback";
import { ButtonA, ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { buildInquiryMessage, whatsappUrl } from "@/lib/whatsapp";
import { formatDate } from "@/lib/format";

const INQUIRY_STATUS: Record<string, { label: string; tone: "info" | "ok" | "neutral" | "bad" }> = {
  new: { label: "Enviada", tone: "info" },
  contacted: { label: "Respondida", tone: "ok" },
  closed: { label: "Cerrada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "bad" },
};

interface InquiryRow {
  id: string;
  number: number;
  status: string;
  notes: string | null;
  created_at: string;
  product_inquiry_items: { sku_snapshot: string; name_snapshot: string; brand_snapshot: string | null; quantity: number }[];
}

export default async function CuentaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const access = await requireUser("/cuenta");
  const [settings, supabase] = await Promise.all([getSettings(), createClient()]);
  const { data: inquiries } = await supabase
    .from("product_inquiries")
    .select("id, number, status, notes, created_at, product_inquiry_items(sku_snapshot, name_snapshot, brand_snapshot, quantity)")
    .eq("profile_id", access.userId!)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="container-page grid gap-8 py-6 sm:py-8">
      <PageHeader eyebrow="Mi cuenta" title={`Hola${access.full_name ? `, ${access.full_name.split(" ")[0]}` : ""}`} />

      {sp.mensaje === "contrasena-actualizada" ? (
        <Alert tone="ok" title="Contraseña actualizada" live />
      ) : null}

      <AccessStatus access={access} whatsapp={settings.whatsapp_number} />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Mis datos</h2>
          <div className="mt-4">
            <ProfileForm fullName={access.full_name ?? ""} phone={access.phone ?? null} email={access.email ?? ""} />
          </div>
        </Card>

        <section aria-labelledby="consultas">
          <h2 id="consultas" className="text-lg font-semibold">
            Mis consultas
          </h2>
          {(inquiries as InquiryRow[] | null)?.length ? (
            <ul className="mt-4 grid gap-3">
              {(inquiries as InquiryRow[]).map((q) => {
                const st = INQUIRY_STATUS[q.status] ?? INQUIRY_STATUS.new;
                const msg = buildInquiryMessage({
                  items: q.product_inquiry_items.map((i) => ({ sku: i.sku_snapshot, name: i.name_snapshot, brand: i.brand_snapshot, quantity: i.quantity })),
                  inquiryNumber: q.number,
                  notes: q.notes,
                  customerName: access.full_name,
                  storeName: settings.store_name,
                });
                return (
                  <li key={q.id}>
                    <Card className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">
                          Consulta #{q.number} <span className="font-normal text-muted">· {formatDate(q.created_at)}</span>
                        </p>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <ul className="mt-3 space-y-1 text-[15px]">
                        {q.product_inquiry_items.map((i) => (
                          <li key={i.sku_snapshot} className="flex gap-2">
                            <span className="font-semibold tabular-nums">{i.quantity}×</span>
                            <span className="min-w-0">
                              {i.name_snapshot} <span className="font-mono text-xs text-muted">({i.sku_snapshot})</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <ButtonA href={whatsappUrl(settings.whatsapp_number, msg)} target="_blank" rel="noopener noreferrer" variant="outline" size="sm" className="mt-4">
                        <WhatsAppIcon /> Reenviar por WhatsApp
                      </ButtonA>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-white p-6 text-[15px] text-muted">
              Todavía no enviaste consultas.
              {access.can_view_catalog ? " Buscá repuestos en el catálogo y armá tu lista." : ""}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function AccessStatus({ access, whatsapp }: { access: Awaited<ReturnType<typeof requireUser>>; whatsapp: string }) {
  if (access.can_view_catalog) {
    return (
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-3 font-semibold">
          <CircleCheck className="size-6 text-brand-ink" aria-hidden /> Tu cuenta tiene acceso al catálogo.
        </p>
        <ButtonLink href="/catalogo">
          Ir al catálogo <ArrowRight aria-hidden />
        </ButtonLink>
      </Card>
    );
  }
  if (access.email_confirmed === false) {
    return (
      <Alert tone="warn" title="Confirmá tu email" live>
        <span className="inline-flex items-center gap-2">
          <MailWarning className="size-4" aria-hidden /> Abrí el enlace que te enviamos por correo para activar tu cuenta.
        </span>
      </Alert>
    );
  }
  if (access.status === "blocked") {
    return (
      <Alert tone="bad" title="Cuenta suspendida" live>
        <span className="inline-flex items-center gap-2">
          <Ban className="size-4" aria-hidden /> Tu cuenta no tiene acceso al catálogo. Si creés que es un error, escribinos.
        </span>
      </Alert>
    );
  }
  return (
    <div className="rounded-2xl border border-warn/25 bg-warn-soft p-5 sm:p-6" role="status">
      <p className="flex items-center gap-2 text-lg font-semibold text-warn">
        <Clock className="size-5" aria-hidden /> Cuenta pendiente de aprobación
      </p>
      <p className="mt-2 max-w-2xl text-[15px] leading-7 text-carbon">
        Tu email ya está confirmado. El local revisa las cuentas nuevas antes de habilitar el catálogo. Mientras tanto, podés consultarnos por
        WhatsApp.
      </p>
      <ButtonA href={whatsappUrl(whatsapp, "Hola, me registré en el catálogo web y quería consultar por la aprobación de mi cuenta.")} target="_blank" rel="noopener noreferrer" variant="dark" className="mt-4">
        <WhatsAppIcon /> Escribir por WhatsApp
      </ButtonA>
    </div>
  );
}
