import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui/feedback";
import { InquiryStatusSelect } from "@/components/admin/row-actions";
import { WhatsAppIcon } from "@/components/site/brand-icons";
import { formatDate } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";

export const metadata = { title: "Consultas" };

interface Row {
  id: string;
  number: number;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string | null } | null;
  product_inquiry_items: { sku_snapshot: string; name_snapshot: string; quantity: number }[];
}

export default async function ConsultasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_inquiries")
    .select("id, number, status, notes, created_at, profiles(full_name, email, phone), product_inquiry_items(sku_snapshot, name_snapshot, quantity)")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as unknown as Row[];
  return (
    <div className="grid gap-5">
      <PageHeader title="Consultas recibidas" description="Cada consulta se registra antes de abrir WhatsApp. Marcá su estado a medida que respondés." />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">Todavía no hay consultas.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => {
            const phone = r.profiles?.phone?.replace(/\D/g, "");
            return (
              <li key={r.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        #{r.number} · {r.profiles?.full_name ?? "Cliente"}
                      </p>
                      <p className="text-[13px] text-muted">
                        {formatDate(r.created_at)} · {r.profiles?.email}
                        {r.profiles?.phone ? ` · ${r.profiles.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {phone && phone.length >= 8 ? (
                        <a
                          href={whatsappUrl(phone.startsWith("54") ? phone : `549${phone.replace(/^0/, "")}`, `Hola ${r.profiles?.full_name ?? ""}, te escribimos de TIM REPUESTOS por tu consulta #${r.number}.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-paper"
                          title="Verificá el número antes de enviar"
                        >
                          <WhatsAppIcon className="size-4" /> Responder
                        </a>
                      ) : null}
                      <InquiryStatusSelect id={r.id} status={r.status} />
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    {r.product_inquiry_items.map((i) => (
                      <li key={i.sku_snapshot}>
                        <span className="font-semibold tabular-nums">{i.quantity}×</span> {i.name_snapshot}{" "}
                        <span className="font-mono text-xs text-muted">({i.sku_snapshot})</span>
                      </li>
                    ))}
                  </ul>
                  {r.notes ? <p className="mt-3 rounded-lg bg-paper p-3 text-sm">“{r.notes}”</p> : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
