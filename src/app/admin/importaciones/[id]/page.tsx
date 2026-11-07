import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";

export default async function ImportJobPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: job } = await supabase.from("import_jobs").select("*").eq("id", id).maybeSingle();
  if (!job) notFound();
  const errors = (job.errors_json ?? []) as { row: number; sku?: string; field?: string; message: string; value?: string }[];
  return (
    <div className="grid gap-5">
      <Link href="/admin/importaciones" className="inline-flex items-center gap-1 text-sm font-semibold text-carbon hover:text-brand-ink">
        <ChevronLeft className="size-4" aria-hidden /> Historial
      </Link>
      <PageHeader title={job.filename} description={`${job.kind === "costs" ? "Costos" : "Catálogo"} · ${formatDate(job.created_at)}`} />
      <Card className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-6">
        {[
          ["Filas", job.total_rows],
          ["Creados", job.created_count],
          ["Actualizados", job.updated_count],
          ["Sin cambios", job.unchanged_count],
          ["Errores", job.error_count],
          ["Duplicados omitidos", job.skipped_count],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-[13px] text-muted">{k}</p>
            <p className="text-xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </Card>
      <Card className="overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Filas rechazadas ({errors.length})</h2>
        {errors.length ? (
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-paper">
                <tr>
                  <th scope="col" className="px-4 py-2">Fila</th>
                  <th scope="col" className="px-4 py-2">SKU</th>
                  <th scope="col" className="px-4 py-2">Campo</th>
                  <th scope="col" className="px-4 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {errors.map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-1.5 tabular-nums">{e.row}</td>
                    <td className="px-4 py-1.5 font-mono">{e.sku}</td>
                    <td className="px-4 py-1.5">{e.field}</td>
                    <td className="px-4 py-1.5">
                      {e.message} {e.value ? <span className="text-muted">({e.value})</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-4 text-[15px] text-muted">Sin errores.</p>
        )}
      </Card>
    </div>
  );
}
