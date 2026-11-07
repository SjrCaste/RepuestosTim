"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonVariantProps } from "./button";
import type { ComponentProps, ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<"button"> & ButtonVariantProps & { pendingText?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-disabled={pending} {...props}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {pendingText ?? "Procesando…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
