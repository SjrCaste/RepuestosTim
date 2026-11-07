import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/footer";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <PublicHeader />
      <main id="contenido">{children}</main>
      <SiteFooter settings={settings} />
      <WhatsAppFab number={settings.whatsapp_number} message="Hola TIM REPUESTOS, quiero hacer una consulta por un repuesto." />
    </>
  );
}
