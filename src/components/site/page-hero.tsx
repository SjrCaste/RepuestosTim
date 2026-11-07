import type { ReactNode } from "react";

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="on-dark relative overflow-hidden bg-graphite text-white">
      <div className="tech-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
      <div className="container-page relative py-14 sm:py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold sm:text-[2.75rem] sm:leading-[1.1]">{title}</h1>
        {children ? <div className="mt-4 max-w-2xl text-[17px] leading-8 text-white/80">{children}</div> : null}
      </div>
    </section>
  );
}
