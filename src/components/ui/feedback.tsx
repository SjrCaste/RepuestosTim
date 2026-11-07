import type { ComponentProps, ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/format";

const alertTones = {
  info: "border-info/20 bg-info-soft text-info",
  ok: "border-brand-ink/25 bg-brand-soft text-brand-ink",
  warn: "border-warn/25 bg-warn-soft text-warn",
  bad: "border-danger/25 bg-danger-soft text-danger",
  neutral: "border-line bg-white text-carbon",
} as const;

const alertIcons = { info: Info, ok: CircleCheck, warn: TriangleAlert, bad: OctagonAlert, neutral: Info };

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** anuncia el mensaje a lectores de pantalla */
  live?: boolean;
}) {
  const Icon = alertIcons[tone];
  return (
    <div
      role={live ? (tone === "bad" ? "alert" : "status") : undefined}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6", alertTones[tone], className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "text-carbon")}>{children}</div> : null}
      </div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-graphite/6 text-carbon ring-graphite/10",
  ok: "bg-brand-soft text-brand-ink ring-brand-ink/20",
  warn: "bg-warn-soft text-warn ring-warn/20",
  bad: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
} as const;

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", badgeTones[tone], className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line bg-white shadow-[var(--shadow-card)]", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-graphite/8", className)} />;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-xl bg-paper text-muted [&_svg]:size-6">{icon}</div> : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children ? <div className="mt-1.5 max-w-md text-[15px] leading-6 text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
