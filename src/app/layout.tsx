import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "TIM REPUESTOS · Repuestos para tu vehículo en Garín",
    template: "%s · TIM REPUESTOS",
  },
  description:
    "Repuestos para tu vehículo, atención personalizada y un catálogo pensado para encontrar cada pieza sin vueltas. Cjal. Larroca 1197, Garín, Buenos Aires.",
  applicationName: "TIM REPUESTOS",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "TIM REPUESTOS",
    title: "TIM REPUESTOS · El repuesto que necesitás. Más fácil de encontrar.",
    description: "Repuestos para tu vehículo y atención personalizada en Garín, Buenos Aires.",
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#141A1D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
