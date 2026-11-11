import { PublicHeader } from "@/components/site/public-header";
import { SiteFooter } from "@/components/site/footer";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { MobileTabBar } from "@/components/site/mobile-tab-bar";
import { getSettings } from "@/lib/settings";
import { whatsappUrl } from "@/lib/whatsapp";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const waMessage = "Hola TIM REPUESTOS, quiero hacer una consulta por un repuesto.";
  return (
    <>
      <PublicHeader />
      <main id="contenido">{children}</main>
      <SiteFooter settings={settings} />
      {/* Escritorio: botón flotante. Celular: barra inferior por secciones. */}
      <div className="hidden lg:block">
        <WhatsAppFab number={settings.whatsapp_number} message={waMessage} />
      </div>
      <MobileTabBar whatsappHref={whatsappUrl(settings.whatsapp_number, waMessage)} />
    </>
  );
}
