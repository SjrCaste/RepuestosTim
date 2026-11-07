import Link from "next/link";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { Alert, Badge, PageHeader } from "@/components/ui/feedback";
import { UserStatusActions } from "@/components/admin/row-actions";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Usuarios" };

const STATUS = {
  pending: { l: "Pendiente", t: "warn" as const },
  active: { l: "Activa", t: "ok" as const },
  blocked: { l: "Bloqueada", t: "bad" as const },
};

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const access = await requireAdmin();
  const sp = await searchParams;
  const estado = ["pending", "active", "blocked"].includes(sp.estado ?? "") ? sp.estado! : "";
  const supabase = await createClient();
  let q = supabase.from("profiles").select("id, full_name, email, phone, role, status, created_at, privacy_accepted_at").order("created_at", { ascending: false }).limit(500);
  if (estado) q = q.eq("status", estado);
  const [{ data }, settings] = await Promise.all([q, getSettings()]);
  const rows = data ?? [];
  const tabs = [
    { v: "", l: "Todas" },
    { v: "pending", l: "Pendientes" },
    { v: "active", l: "Activas" },
    { v: "blocked", l: "Bloqueadas" },
  ];
  return (
    <div className="grid gap-5">
      <PageHeader title="Usuarios" description="Aprobá, bloqueá o reactivá cuentas de clientes. El rol administrador sólo se asigna desde el servidor (ver documentación)." />
      <Alert tone="info">
        Modo aprobación: <strong>{settings.requires_approval ? "activado" : "desactivado"}</strong>.{" "}
        {settings.requires_approval
          ? "Las cuentas nuevas verificadas quedan pendientes hasta que las apruebes."
          : "Las cuentas verificadas acceden al catálogo sin aprobación."}{" "}
        <Link href="/admin/configuracion" className="font-semibold underline">
          Cambiar
        </Link>
      </Alert>
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <Link
            key={t.v}
            href={t.v ? `/admin/usuarios?estado=${t.v}` : "/admin/usuarios"}
            aria-current={estado === t.v ? "page" : undefined}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", estado === t.v ? "bg-graphite text-white" : "text-carbon hover:bg-graphite/5")}
          >
            {t.l}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-muted">No hay cuentas en este estado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-[13px] text-muted">
              <tr>
                {["Nombre", "Email / teléfono", "Alta", "Estado", "Acciones"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => {
                const st = STATUS[u.status as keyof typeof STATUS];
                return (
                  <tr key={u.id}>
                    <td className="px-3 py-2.5 font-semibold">
                      {u.full_name} {u.role === "admin" ? <Badge tone="info">Admin</Badge> : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{u.email}</div>
                      {u.phone ? <div className="text-muted">{u.phone}</div> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">{formatDate(u.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={st.t}>{st.l}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.role === "admin" || u.id === access.userId ? <span className="text-xs text-muted">—</span> : <UserStatusActions id={u.id} status={u.status} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
