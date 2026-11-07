/**
 * Datos del comercio usados como respaldo cuando la base todavía no está
 * conectada. En producción se leen de la tabla `settings` (editable en
 * /admin/configuracion). No agregar datos no confirmados por el dueño.
 */
export const SITE_DEFAULTS = {
  store_name: "TIM REPUESTOS",
  address: "Cjal. Larroca 1197, Garín, Buenos Aires, Argentina",
  phone_display: "+54 9 11 3003-7581",
  whatsapp_number: "5491130037581",
  whatsapp_confirmed: false,
  instagram_url: "https://www.instagram.com/timrepuestosgarin/",
  maps_url: "https://www.google.com/maps/search/?api=1&query=Cjal.+Larroca+1197,+Gar%C3%ADn,+Buenos+Aires",
  email_public: null as string | null,
  business_hours: null as string | null,
  pickup_confirmed: false,
  requires_approval: true,
  prices_visible_to_customers: false,
  hero_image_url: null as string | null,
  about_image_url: null as string | null,
  privacy_policy_version: "2026-11-borrador",
};

export type SiteSettings = typeof SITE_DEFAULTS;

/**
 * Logo oficial: copiar el archivo original a /public/brand/ y completar la
 * ruta (ej. "/brand/logo-tim-repuestos.png"). Mientras sea null se muestra el
 * nombre del comercio en texto (no se redibuja el logo).
 */
export const BRAND = {
  logoSrc: null as string | null,
  logoWidth: 160,
  logoHeight: 48,
  instagramHandle: "@timrepuestosgarin",
};

export const PRIVACY_POLICY_VERSION = SITE_DEFAULTS.privacy_policy_version;
