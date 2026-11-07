"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Field, Input, Checkbox } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  forgotPasswordAction,
  resendVerificationAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/app/(site)/(auth)/actions";
import type { FormState } from "@/lib/validation";

function PasswordInput(props: React.ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-graphite"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  );
}

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.ok ? "ok" : "bad"} live>
      {state.message}
    </Alert>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInAction, {});
  return (
    <div className="grid gap-5">
      <form action={action} className="grid gap-5" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormMessage state={state} />
        <Field label="Email" required error={state.errors?.email}>
          {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} />}
        </Field>
        <Field label="Contraseña" required error={state.errors?.password}>
          {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" />}
        </Field>
        <div className="-mt-2 text-right">
          <Link href="/recuperar" className="text-sm font-semibold text-brand-ink hover:underline">
            Olvidé mi contraseña
          </Link>
        </div>
        <SubmitButton size="lg" pendingText="Ingresando…">
          Ingresar
        </SubmitButton>
      </form>
      {state.values?.unconfirmed ? <ResendForm email={state.values.email} /> : null}
    </div>
  );
}

function ResendForm({ email }: { email?: string }) {
  const [state, action] = useActionState(resendVerificationAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-line bg-paper p-4">
      <input type="hidden" name="email" value={email ?? ""} />
      <p className="text-sm text-carbon">¿No te llegó el correo de confirmación?</p>
      <FormMessage state={state} />
      <SubmitButton variant="outline" size="sm" pendingText="Enviando…">
        Reenviar enlace de confirmación
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpAction, {});
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {/* honeypot anti-bots: invisible para personas */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Sitio web <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <FormMessage state={state} />
      <Field label="Nombre y apellido" required error={state.errors?.full_name}>
        {(p) => <Input {...p} name="full_name" autoComplete="name" defaultValue={state.values?.full_name} maxLength={120} />}
      </Field>
      <Field label="Email" required error={state.errors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} />}
      </Field>
      <Field label="Teléfono" hint="Para coordinar tus consultas. Ej.: 11 2345-6789" error={state.errors?.phone}>
        {(p) => <Input {...p} name="phone" type="tel" autoComplete="tel" inputMode="tel" defaultValue={state.values?.phone} maxLength={25} />}
      </Field>
      <Field label="Contraseña" required hint="Mínimo 10 caracteres, con letras y números." error={state.errors?.password}>
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" />}
      </Field>
      <Field label="Repetí la contraseña" required error={state.errors?.password_confirm}>
        {(p) => <PasswordInput {...p} name="password_confirm" autoComplete="new-password" />}
      </Field>
      <div className="grid gap-1.5">
        <label className="flex gap-3 text-sm leading-6 text-carbon">
          <Checkbox name="privacy" required aria-invalid={state.errors?.privacy ? true : undefined} aria-describedby={state.errors?.privacy ? "privacy-error" : undefined} />
          <span>
            Leí y acepto la{" "}
            <Link href="/privacidad" target="_blank" className="font-semibold text-brand-ink underline">
              política de privacidad
            </Link>{" "}
            y los{" "}
            <Link href="/terminos" target="_blank" className="font-semibold text-brand-ink underline">
              términos de uso
            </Link>
            .
          </span>
        </label>
        {state.errors?.privacy ? (
          <p id="privacy-error" className="text-[13px] font-medium text-danger">
            {state.errors.privacy}
          </p>
        ) : null}
      </div>
      <SubmitButton size="lg" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Email de tu cuenta" required error={state.errors?.email}>
        {(p) => <Input {...p} name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} />}
      </Field>
      <SubmitButton size="lg" pendingText="Enviando…">
        Enviar enlace
      </SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Nueva contraseña" required hint="Mínimo 10 caracteres, con letras y números." error={state.errors?.password}>
        {(p) => <PasswordInput {...p} name="password" autoComplete="new-password" />}
      </Field>
      <Field label="Repetí la contraseña" required error={state.errors?.password_confirm}>
        {(p) => <PasswordInput {...p} name="password_confirm" autoComplete="new-password" />}
      </Field>
      <SubmitButton size="lg" pendingText="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
