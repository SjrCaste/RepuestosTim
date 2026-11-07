"use client";
import { useActionState, useState, useTransition } from "react";
import { Upload, Trash2, LoaderCircle } from "lucide-react";
import { saveSettingsAction, setSiteImageAction } from "@/app/admin/actions";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/form";
import { Alert, Card } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { EXT, MAX_IMAGE_BYTES, sniffImageType } from "@/lib/image-upload";
import type { SiteSettings } from "@/config/site";

function Toggle({ name, label, help, defaultChecked }: { name: string; label: string; help: string; defaultChecked: boolean }) {
  return (
    <label className="flex gap-3 rounded-xl border border-line p-4">
      <Checkbox name={name} defaultChecked={defaultChecked} />
      <span>
        <span className="font-semibold">{label}</span>
        <span className="mt-0.5 block text-[13px] leading-5 text-muted">{help}</span>
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState(saveSettingsAction, {});
  const v = (k: keyof SiteSettings) => state.values?.[k] ?? (settings[k] === null ? "" : String(settings[k]));
  return (
    <form action={action} className="grid gap-5" noValidate>
      {state.message ? (
        <Alert tone={state.ok ? "ok" : "bad"} live>
          {state.message}
        </Alert>
      ) : null}
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Datos del comercio</h2>
        <Field label="Nombre" required error={state.errors?.store_name}>
          {(p) => <Input {...p} name="store_name" defaultValue={v("store_name")} />}
        </Field>
        <Field label="Dirección" required error={state.errors?.address}>
          {(p) => <Input {...p} name="address" defaultValue={v("address")} />}
        </Field>
        <Field label="Teléfono visible" error={state.errors?.phone_display}>
          {(p) => <Input {...p} name="phone_display" defaultValue={v("phone_display")} />}
        </Field>
        <Field label="WhatsApp (formato internacional)" required hint="Ej.: 5491130037581 (54 + 9 + área sin 0 + número sin 15)" error={state.errors?.whatsapp_number}>
          {(p) => <Input {...p} name="whatsapp_number" inputMode="numeric" defaultValue={v("whatsapp_number")} />}
        </Field>
        <Field label="Instagram" error={state.errors?.instagram_url}>
          {(p) => <Input {...p} name="instagram_url" defaultValue={v("instagram_url")} />}
        </Field>
        <Field label="Enlace de Google Maps" error={state.errors?.maps_url}>
          {(p) => <Input {...p} name="maps_url" defaultValue={v("maps_url")} />}
        </Field>
        <Field label="Email público" error={state.errors?.email_public}>
          {(p) => <Input {...p} name="email_public" type="email" defaultValue={v("email_public")} />}
        </Field>
        <Field label="Horarios de atención" hint="Sólo horarios confirmados. Vacío = “Consultá horarios por WhatsApp”." error={state.errors?.business_hours}>
          {(p) => <Textarea {...p} name="business_hours" defaultValue={v("business_hours")} rows={3} placeholder={"Lun a vie: …\nSáb: …"} />}
        </Field>
      </Card>
      <Card className="grid gap-3 p-5">
        <h2 className="font-semibold">Catálogo y acceso</h2>
        <Toggle
          name="requires_approval"
          label="Requerir aprobación de cuentas"
          help="Si está activo, los clientes verificados ven “Cuenta pendiente de aprobación” hasta que los apruebes en Usuarios."
          defaultChecked={settings.requires_approval}
        />
        <Toggle
          name="prices_visible_to_customers"
          label="Mostrar precios de venta a clientes"
          help="Activalo sólo cuando el dueño confirme la vigencia de los precios. Desactivado: se muestra “Consultar precio” y el valor no se envía al navegador."
          defaultChecked={settings.prices_visible_to_customers}
        />
        <Toggle name="whatsapp_confirmed" label="Número de WhatsApp confirmado por el dueño" help="Se usa además en los datos estructurados para buscadores." defaultChecked={settings.whatsapp_confirmed} />
        <Toggle name="pickup_confirmed" label="Ofrecer “Retiro en Garín”" help="Muestra el beneficio en la home. Activalo sólo si el local lo confirma." defaultChecked={settings.pickup_confirmed} />
      </Card>
      <div>
        <SubmitButton size="lg" pendingText="Guardando…">
          Guardar configuración
        </SubmitButton>
      </div>
    </form>
  );
}

export function SiteImageUploader({ field, label, url }: { field: "hero_image_url" | "about_image_url"; label: string; url: string | null }) {
  const [current, setCurrent] = useState(url);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const onFile = (file?: File) => {
    if (!file) return;
    start(async () => {
      setMsg(null);
      if (file.size > MAX_IMAGE_BYTES) return setMsg("La imagen supera 5 MB.");
      const type = sniffImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
      if (!type) return setMsg("Usá JPG, PNG o WebP.");
      const supabase = createBrowserSupabase();
      const key = `site/${field}-${Date.now().toString(36)}.${EXT[type]}`;
      const { error } = await supabase.storage.from("site-assets").upload(key, file, { contentType: type, cacheControl: "31536000" });
      if (error) return setMsg(error.message);
      const publicUrl = supabase.storage.from("site-assets").getPublicUrl(key).data.publicUrl;
      const r = await setSiteImageAction(field, publicUrl);
      if (!r.ok) return setMsg(r.message ?? "Error");
      setCurrent(publicUrl);
    });
  };
  return (
    <div className="grid gap-3">
      <p className="font-semibold">{label}</p>
      <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-line bg-paper">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-sm text-muted">Sin foto: se muestra un diseño alternativo</span>
        )}
      </div>
      {msg ? <p className="text-sm text-danger" role="alert">{msg}</p> : null}
      <div className="flex gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-graphite px-3 text-sm font-semibold text-white hover:bg-carbon">
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          Subir foto real
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {current ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              start(async () => {
                const r = await setSiteImageAction(field, null);
                if (r.ok) setCurrent(null);
              })
            }
          >
            <Trash2 aria-hidden /> Quitar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
