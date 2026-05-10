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
      </head>
      <body className={`${inter.variable} ${mono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
