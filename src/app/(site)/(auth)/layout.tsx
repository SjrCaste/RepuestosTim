import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tech-grid-light min-h-[calc(100dvh-4rem)] bg-paper">
      <div className="container-page flex justify-center py-10 sm:py-16">
        <div className="w-full max-w-[460px] animate-fade-up rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-lift)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
