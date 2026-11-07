import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email demasiado largo")
  .pipe(z.email("Ingresá un email válido"));

export const passwordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(72, "Máximo 72 caracteres")
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "Incluí al menos una letra")
  .regex(/[0-9]/, "Incluí al menos un número");

export const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Ingresá tu nombre").max(120, "Nombre demasiado largo"),
    email,
    phone: z
      .string()
      .trim()
      .max(25)
      .refine((v) => v === "" || /^[0-9 +()-]{6,25}$/.test(v), "Teléfono inválido (sólo números, espacios, + ( ) -)")
      .optional()
      .transform((v) => v || undefined),
    password: passwordSchema,
    password_confirm: z.string(),
    privacy: z.literal("on", { message: "Tenés que aceptar la política de privacidad y los términos" }),
    // honeypot anti-bots: debe llegar vacío
    website: z.string().max(0).optional(),
  })
  .refine((d) => d.password === d.password_confirm, { message: "Las contraseñas no coinciden", path: ["password_confirm"] });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Ingresá tu contraseña").max(200),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: passwordSchema, password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, { message: "Las contraseñas no coinciden", path: ["password_confirm"] });

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  phone: z
    .string()
    .trim()
    .max(25)
    .refine((v) => v === "" || /^[0-9 +()-]{6,25}$/.test(v), "Teléfono inválido")
    .transform((v) => v || null),
});

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU obligatorio").max(64).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1, "Nombre obligatorio").max(300),
  description: z.string().trim().max(4000).transform((v) => v || null),
  brand_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  category_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  sale_price_ars: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: "Precio inválido" });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    }),
  cost_price_ars: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: "Costo inválido" });
        return z.NEVER;
      }
      return Math.round(n * 100) / 100;
    }),
  stock_status: z.enum(["unknown", "available", "on_request", "out_of_stock"]),
  stock_quantity: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: "Cantidad inválida" });
        return z.NEVER;
      }
      return n;
    }),
  compatibility: z.string().trim().max(4000).transform((v) => v || null),
  compatibility_verified: z.string().optional().transform((v) => v === "on"),
  active: z.string().optional().transform((v) => v === "on"),
});

export const settingsSchema = z.object({
  store_name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(300),
  phone_display: z.string().trim().max(40).transform((v) => v || null),
  whatsapp_number: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[0-9]{8,15}$/, "Número de WhatsApp inválido: usá formato internacional, ej. 5491130037581")),
  whatsapp_confirmed: z.string().optional().transform((v) => v === "on"),
  instagram_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https:\/\/(www\.)?instagram\.com\//.test(v), "Debe ser un enlace https://www.instagram.com/…")
    .transform((v) => v || null),
  maps_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Debe ser un enlace https://")
    .transform((v) => v || null),
  email_public: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Email inválido")
    .transform((v) => v || null),
  business_hours: z.string().trim().max(500).transform((v) => v || null),
  pickup_confirmed: z.string().optional().transform((v) => v === "on"),
  requires_approval: z.string().optional().transform((v) => v === "on"),
  prices_visible_to_customers: z.string().optional().transform((v) => v === "on"),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
};
