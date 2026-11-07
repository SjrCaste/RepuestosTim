import { requireAdmin } from "@/lib/auth/access";
import { getSettings } from "@/lib/settings";
import { Card, PageHeader } from "@/components/ui/feedback";
import { SettingsForm, SiteImageUploader } from "@/components/admin/settings-form";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="grid gap-6">
      <PageHeader title="Configuración" description="Datos de contacto, horarios, enlaces y reglas del catálogo. Los cambios se reflejan en la web pública en pocos segundos." />
      <SettingsForm settings={settings} />
      <Card className="grid gap-6 p-5 md:grid-cols-2">
        <SiteImageUploader field="hero_image_url" label="Foto principal de la home" url={settings.hero_image_url} />
        <SiteImageUploader field="about_image_url" label="Foto del local (sección Nosotros)" url={settings.about_image_url} />
      </Card>
    </div>
  );
}
