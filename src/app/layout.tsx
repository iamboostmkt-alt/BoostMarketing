import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BoostMarketing - Agencia Creativa & CRM Platform",
  description:
    "Escala tu marca con contenido y automatización. Producción de contenido, estrategia digital, CRM y analytics en una sola plataforma.",
};

async function getSettings() {
  try {
    return await db.siteSettings.findFirst();
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="es">
      <head>
        {settings?.faviconUrl ? (
          <link rel="icon" href={settings.faviconUrl} />
        ) : (
          <link rel="icon" href="/favicon.ico" />
        )}
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8B5CF6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Weeklink" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} ${mono.variable} antialiased bg-background text-foreground`}>
        {/* Inject branding into localStorage before React hydrates — eliminates logo flash */}
        {settings?.logoUrl && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                try {
                  localStorage.setItem('brand_logoUrl', ${JSON.stringify(settings.logoUrl)});
                  localStorage.setItem('brand_agencyName', ${JSON.stringify(settings.agencyName || 'BoostMarketing')});
                } catch(e) {}
              `,
            }}
          />
        )}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
