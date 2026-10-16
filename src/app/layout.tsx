import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";

const instrument = localFont({
  src: "./fonts/instrument-serif-latin-400-normal.woff2",
  variable: "--font-instrument",
  display: "swap",
});

const sora = localFont({
  src: "./fonts/sora-latin-600-normal.woff2",
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "SondIA", template: "%s · SondIA" },
  description: "ERP interno de SondIA: horas, tareas, LPs y OBVs, clientes y objetivos.",
  robots: { index: false, follow: false },
  appleWebApp: { title: "SondIA", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d12" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html
      lang="es"
      data-theme={dataTheme}
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrument.variable} ${sora.variable}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
