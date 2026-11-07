import Link from "next/link";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { Badge, PageHeader } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Historial de importaciones" };

export default async function ImportacionesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("import_jobs")
    .select("id, kind, filename, status, total_rows, created_count, updated_count, unchanged_count, error_count, skipped_count, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as {
    id: string;
    kind: string;
    filename: string;
    status: string;
    total_rows: number;
    created_count: number;
    updated_count: number;
    unchanged_count: number;
    error_count: number;
    skipped_count: number;
    created_at: string;
    profiles: { full_name: string } | null;
  }[];
  return (
    <div className="grid gap-5">
      <PageHeader title="Historial de importaciones" description="Registro de cada archivo importado con sus resultados y errores." />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">Todavía no hay importaciones.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-[13px] text-muted">
              <tr>
                {["Fecha", "Archivo", "Tipo", "Estado", "Filas", "Creados", "Actualizados", "Sin cambios", "Errores", "Por"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link href={`/admin/importaciones/${r.id}`} className="font-semibold text-brand-ink hover:underline">
                      {formatDate(r.created_at)}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5">{r.filename}</td>
                  <td className="px-3 py-2.5">{r.kind === "costs" ? "Costos" : "Catálogo"}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={r.status === "completed" ? "ok" : r.status === "failed" ? "bad" : "warn"}>
                      {r.status === "completed" ? "Completa" : r.status === "failed" ? "Falló" : "En curso"}
                    </Badge>
                  </td>
                  {[r.total_rows, r.created_count, r.updated_count, r.unchanged_count, r.error_count].map((n, i) => (
                    <td key={i} className="px-3 py-2.5 tabular-nums">
                      {n}
                    </td>
                  ))}
                  <td className="px-3 py-2.5">{r.profiles?.full_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
