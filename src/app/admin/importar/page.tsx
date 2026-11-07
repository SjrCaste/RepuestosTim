import { requireAdmin } from "@/lib/auth/access";
import { PageHeader } from "@/components/ui/feedback";
import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata = { title: "Importar productos" };

export default async function ImportarPage() {
  await requireAdmin();
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Importar productos"
        description="Subí el CSV preparado (tim_repuestos_catalogo_tochter.csv) o el Excel original. Revisá la vista previa y los errores antes de confirmar."
      />
      <ImportWizard />
    </div>
  );
}
