import type { Metadata } from "next";
import { AppHeader } from "@/components/site/app-header";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Administración", template: "%s · Admin TIM REPUESTOS" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAdmin();
  const supabase = await createClient();
  const [{ count: pending }, { count: inquiries }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending").neq("role", "admin"),
    supabase.from("product_inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  return (
    <>
      <AppHeader access={access} />
      <div className="container-page grid gap-6 py-5 lg:grid-cols-[220px_1fr] lg:gap-10 lg:py-8">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <AdminNav pendingUsers={pending ?? 0} newInquiries={inquiries ?? 0} />
        </aside>
        <main id="contenido" className="min-w-0 pb-16">
          {children}
        </main>
      </div>
    </>
  );
}
