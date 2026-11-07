"use client";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfileAction } from "@/app/cuenta/actions";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string | null; email: string }) {
  const [state, action] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.message ? (
        <Alert tone={state.ok ? "ok" : "bad"} live>
          {state.message}
        </Alert>
      ) : null}
      <Field label="Email" hint="Para cambiar el email, escribinos.">
        {(p) => <Input {...p} value={email} readOnly disabled />}
      </Field>
      <Field label="Nombre y apellido" required error={state.errors?.full_name}>
        {(p) => <Input {...p} name="full_name" defaultValue={fullName} autoComplete="name" maxLength={120} />}
      </Field>
      <Field label="Teléfono" error={state.errors?.phone}>
        {(p) => <Input {...p} name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" maxLength={25} />}
      </Field>
      <div>
        <SubmitButton variant="dark" pendingText="Guardando…">
          Guardar cambios
        </SubmitButton>
      </div>
    </form>
  );
}
