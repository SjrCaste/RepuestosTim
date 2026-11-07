import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // verde de marca con texto grafito (contraste 8.5:1)
        primary: "bg-brand text-graphite hover:bg-brand-hover shadow-[inset_0_-2px_0_rgb(0_0_0/0.08)]",
        dark: "bg-graphite text-white hover:bg-carbon",
        outline: "border border-line bg-white text-graphite hover:border-graphite/40 hover:bg-paper",
        "outline-dark": "border border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/35",
        ghost: "text-graphite hover:bg-graphite/5",
        "ghost-dark": "text-white/85 hover:bg-white/10 hover:text-white",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "h-auto px-0 text-brand-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-[15px]",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ComponentProps<"button"> & ButtonVariantProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: ComponentProps<typeof Link> & ButtonVariantProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonA({ className, variant, size, ...props }: ComponentProps<"a"> & ButtonVariantProps) {
  return <a className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
